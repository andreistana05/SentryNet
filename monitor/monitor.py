import time
import requests
import subprocess
import platform
import ipaddress
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
API_KEY = os.getenv("INGEST_API_KEY", "change-me-ingest-key")
INTERVAL = int(os.getenv("MONITOR_INTERVAL", "30"))
OFFLINE_THRESHOLD = int(os.getenv("OFFLINE_THRESHOLD", "3"))
PING_COUNT = int(os.getenv("PING_COUNT", "1"))
PING_TIMEOUT = int(os.getenv("PING_TIMEOUT", "1"))
NETWORK_RANGE = os.getenv("NETWORK_RANGE", "")
DISCOVERY_INTERVAL = int(os.getenv("DISCOVERY_INTERVAL", "300"))  # re-scan every 5 min
DISCOVERY_WORKERS = int(os.getenv("DISCOVERY_WORKERS", "50"))      # parallel ping workers
DEVICES_FILE = os.path.join(os.path.dirname(__file__), "devices.json")


def load_devices_from_file():
    """Load devices from a JSON file (fallback)."""
    try:
        with open(DEVICES_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"File {DEVICES_FILE} does not exist. Using default list.")
        return [
            {"hostname": "server1", "ip_address": "192.168.1.10", "type": "server"},
            {"hostname": "router1", "ip_address": "192.168.1.1", "type": "router"},
        ]


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


def discover_devices(network_range):
    """Ping-sweep the network in parallel and return responding hosts."""
    print(f"Scanning network: {network_range} ...")
    try:
        network = ipaddress.ip_network(network_range, strict=False)
        hosts = [str(h) for h in network.hosts()]  # excludes network/broadcast
    except ValueError as e:
        print(f"Invalid network range '{network_range}': {e}. Falling back to devices.json.")
        return load_devices_from_file()

    alive = []
    with ThreadPoolExecutor(max_workers=DISCOVERY_WORKERS) as ex:
        futures = {ex.submit(_ping_once, ip): ip for ip in hosts}
        for future in as_completed(futures):
            ip, is_up = future.result()
            if is_up:
                alive.append({"hostname": ip, "ip_address": ip, "type": "server"})

    alive.sort(key=lambda d: ipaddress.ip_address(d["ip_address"]))
    print(f"Discovery found {len(alive)} device(s): {[d['ip_address'] for d in alive]}")
    return alive


load_devices = load_devices_from_file  # alias used by tests


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
            print(f"Backend returned {response.status_code}, falling back to local source.")
    except Exception as e:
        print(f"Could not reach backend: {e}. Falling back to local source.")
    return None


def get_devices():
    """Return device list.

    If NETWORK_RANGE is set, ping-sweep is the source of truth for discovery;
    manually registered backend devices (outside the scanned range) are merged in.
    Otherwise fall back to backend list, then devices.json.
    """
    if NETWORK_RANGE:
        found = discover_devices(NETWORK_RANGE)
        backend_devices = fetch_devices_from_backend() or []
        found_ips = {d["ip_address"] for d in found}
        extra = [d for d in backend_devices if d["ip_address"] not in found_ips]
        return found + extra

    backend_devices = fetch_devices_from_backend()
    if backend_devices is not None:
        return backend_devices
    return load_devices_from_file()


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
        # Re-fetch device list periodically to pick up new devices
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
