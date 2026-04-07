import time
import socket
import requests
import subprocess
import platform
import ipaddress
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
API_KEY = os.getenv("INGEST_API_KEY", "sk-infrapulse-7f3Kx9mQpL2wNvR8dYcT4jZbHnUeA6sW")
INTERVAL = int(os.getenv("MONITOR_INTERVAL", "30"))
OFFLINE_THRESHOLD = int(os.getenv("OFFLINE_THRESHOLD", "3"))
PING_COUNT = int(os.getenv("PING_COUNT", "1"))
PING_TIMEOUT = int(os.getenv("PING_TIMEOUT", "1"))
NETWORK_RANGE = os.getenv("NETWORK_RANGE", "")
DISCOVERY_INTERVAL = int(os.getenv("DISCOVERY_INTERVAL", "300"))  # re-scan every 5 min
DISCOVERY_WORKERS = int(os.getenv("DISCOVERY_WORKERS", "50"))      # parallel ping workers


def get_default_gateway():
    """Return the default gateway IP of this machine, or None if undetectable."""
    try:
        if platform.system().lower() == 'windows':
            result = subprocess.run(['ipconfig'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if 'Default Gateway' in line:
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        gw = parts[1].strip()
                        if gw:
                            return gw
        else:
            result = subprocess.run(['ip', 'route'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if line.startswith('default'):
                    parts = line.split()
                    if len(parts) > 2:
                        return parts[2]
    except Exception:
        pass
    return None


# Prefer explicitly configured gateway, fall back to auto-detection
GATEWAY_IP = os.getenv("GATEWAY_IP") or get_default_gateway()
if GATEWAY_IP:
    print(f"[INFO] Gateway IP: {GATEWAY_IP}")


def resolve_hostname(ip):
    """Reverse DNS lookup. Returns the hostname or the IP itself if unresolvable."""
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ip


def detect_device_type(ip):
    """Guess device type from port probing.

    Priority:
      1. Matches default gateway            → router  (most reliable for home routers)
      2. Port 9100 open                     → printer (JetDirect / raw print)
      3. Port 23 open                       → router  (Telnet, enterprise network gear)
      4. Port 3389 open                     → workstation (Windows RDP)
      5. Port 80/443 open, no Windows ports → router  (web-only admin, e.g. home router)
      6. Anything else                      → server
    """
    if ip == GATEWAY_IP:
        return "router"

    probe_ports = [9100, 23, 3389, 80, 443, 445]
    open_ports = set()
    for port in probe_ports:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.4)
            if s.connect_ex((ip, port)) == 0:
                open_ports.add(port)
            s.close()
        except Exception:
            pass

    if 9100 in open_ports:
        return "printer"
    if 23 in open_ports:
        return "router"
    if 3389 in open_ports:
        return "workstation"
    # Web interface present but no Windows/printer ports → likely a router or AP
    if (80 in open_ports or 443 in open_ports) and 445 not in open_ports:
        return "router"
    return "server"


def _ping_once(ip):
    """Ping an IP once with a 1-second timeout. Returns (ip, alive)."""
    try:
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        timeout_param = '-w' if platform.system().lower() == 'windows' else '-W'
        command = ['ping', param, '1', timeout_param, '1', ip]
        result = subprocess.run(command, capture_output=True, timeout=3)
        return ip, result.returncode == 0
    except Exception:
        return ip, False


def _identify_device(ip):
    """Ping, then resolve hostname and detect type for a single IP."""
    _, alive = _ping_once(ip)
    if not alive:
        return None
    hostname = resolve_hostname(ip)
    device_type = detect_device_type(ip)
    return {"hostname": hostname, "ip_address": ip, "type": device_type}


def discover_devices(network_range):
    """Ping-sweep + auto-identify all responding hosts on the network."""
    print(f"Scanning network: {network_range} ...")
    try:
        network = ipaddress.ip_network(network_range, strict=False)
        hosts = [str(h) for h in network.hosts()]
    except ValueError as e:
        print(f"Invalid network range '{network_range}': {e}")
        return []

    alive = []
    with ThreadPoolExecutor(max_workers=DISCOVERY_WORKERS) as ex:
        futures = {ex.submit(_identify_device, ip): ip for ip in hosts}
        for future in as_completed(futures):
            result = future.result()
            if result:
                alive.append(result)

    alive.sort(key=lambda d: ipaddress.ip_address(d["ip_address"]))
    print(f"Discovery found {len(alive)} device(s): {[d['ip_address'] for d in alive]}")
    return alive


def fetch_devices_from_backend():
    """Fetch all registered devices from the backend API."""
    headers = {"X-API-Key": API_KEY}
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/ingest/devices", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json().get("data", [])
            devices = [
                {
                    "hostname": d.get("hostname") or d.get("name", d["ip_address"]),
                    "ip_address": d["ip_address"],
                    "type": d.get("type", "server"),
                }
                for d in data
                if d.get("ip_address")
            ]
            print(f"Fetched {len(devices)} device(s) from backend.")
            return devices
        else:
            print(f"Backend returned {response.status_code}.")
    except Exception as e:
        print(f"Could not reach backend: {e}.")
    return None


def get_devices():
    """Return device list.

    If NETWORK_RANGE is set, ping-sweep + auto-detection is the source of truth.
    Devices already in the backend but outside the scanned range are merged in.
    Otherwise, fall back to the backend list only.
    """
    if NETWORK_RANGE:
        found = discover_devices(NETWORK_RANGE)
        backend_devices = fetch_devices_from_backend() or []
        found_ips = {d["ip_address"] for d in found}
        extra = [d for d in backend_devices if d["ip_address"] not in found_ips]
        return found + extra

    backend_devices = fetch_devices_from_backend()
    return backend_devices or []


def ping_device(ip):
    """Send ping to IP and return True if it responds."""
    try:
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, str(PING_COUNT), ip]
        result = subprocess.run(command, capture_output=True, text=True, timeout=PING_TIMEOUT + 2)
        return result.returncode == 0
    except Exception:
        return False


def send_heartbeat(hostname, ip, device_type):
    """Send heartbeat to backend."""
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
    data = {"hostname": hostname, "ip_address": ip, "device_type": device_type}
    try:
        response = requests.post(f"{BACKEND_URL}/api/v1/ingest/heartbeat", json=data, headers=headers)
        if response.status_code == 200:
            print(f"Heartbeat sent for {hostname} ({ip})")
        else:
            print(f"Heartbeat error for {hostname}: {response.status_code}")
    except Exception as e:
        print(f"HTTP error for {hostname}: {e}")


def send_error_event(hostname, ip, device_type, error_type, error_text):
    """Send an error event to backend as a metrics payload."""
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
    payload = {
        "hostname": hostname,
        "ip_address": ip,
        "device_type": device_type,
        "metrics": [{"type": error_type, "value": 1, "unit": "count"}],
    }
    try:
        response = requests.post(f"{BACKEND_URL}/api/v1/ingest/metrics", json=payload, headers=headers)
        if response.status_code == 202:
            print(f"Error event sent for {hostname} ({ip}): {error_text}")
        else:
            print(f"Error event failed for {hostname}: {response.status_code} {response.text}")
    except Exception as e:
        print(f"HTTP error sending event for {hostname}: {e}")


def main():
    devices = get_devices()
    print(f"Network monitor started... Monitoring {len(devices)} devices.")
    device_state = {}
    last_discovery = time.time()

    while True:
        if (time.time() - last_discovery) >= DISCOVERY_INTERVAL:
            updated = get_devices()
            if updated:
                devices = updated
            last_discovery = time.time()
            print(f"Device list updated: {len(devices)} device(s).")

        for device in devices:
            ip = device["ip_address"]
            hostname = device.get("hostname", ip)
            device_type = device.get("type", "server")
            alive = ping_device(ip)
            state = device_state.get(ip, {"failed": 0, "offline": False})

            if alive:
                if state["offline"]:
                    print(f"Device recovered: {hostname} ({ip})")
                state["failed"] = 0
                state["offline"] = False
                send_heartbeat(hostname, ip, device_type)
            else:
                state["failed"] += 1
                if state["failed"] >= OFFLINE_THRESHOLD and not state["offline"]:
                    print(f"Device offline detected: {hostname} ({ip})")
                    state["offline"] = True
                    send_error_event(hostname, ip, device_type, "ping_failure", "Device failed ping threshold")

            device_state[ip] = state

        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()