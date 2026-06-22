"""
Network Monitor

Discovers and monitors all devices reachable on one or more configured CIDR
ranges.  For each monitoring cycle it:
  - Pings every device to measure RTT and packet loss.
  - Probes well-known TCP ports per device type to detect service outages.
  - Sends heartbeats and passive metrics to the SentryNet backend.
  - Fires or resolves alarms via the event endpoint when a device goes offline
    or comes back online.

The device list is refreshed every DISCOVERY_INTERVAL seconds by re-scanning
the network and merging with devices already registered in the backend.
"""
import time
import socket
import requests
import subprocess
import platform
import ipaddress
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from snmp_collector import collect_snmp_metrics

# ---- Configuration ----

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
API_KEY = os.getenv("INGEST_API_KEY", "change-me-ingest-key")
INTERVAL = int(os.getenv("MONITOR_INTERVAL", "30"))           # seconds between polling cycles
OFFLINE_THRESHOLD = int(os.getenv("OFFLINE_THRESHOLD", "3"))  # consecutive failures before marking offline
PING_COUNT = int(os.getenv("PING_COUNT", "1"))
PING_TIMEOUT = int(os.getenv("PING_TIMEOUT", "1"))
_raw_range = os.getenv("NETWORK_RANGE", "")
NETWORK_RANGES = [r.strip() for r in _raw_range.split(",") if r.strip()]
DISCOVERY_INTERVAL = int(os.getenv("DISCOVERY_INTERVAL", "300"))  # re-scan every 5 min
DISCOVERY_WORKERS = int(os.getenv("DISCOVERY_WORKERS", "50"))      # parallel ping workers

# Comma-separated CIDR ranges to exclude from monitoring (e.g. Docker bridge networks).
# Defaults to the Docker bridge range so container IPs are never registered as devices.
_raw_ignore = os.getenv("IGNORE_RANGES", "172.16.0.0/12")
IGNORE_NETWORKS = []
for _cidr in _raw_ignore.split(","):
    _cidr = _cidr.strip()
    if _cidr:
        try:
            IGNORE_NETWORKS.append(ipaddress.ip_network(_cidr, strict=False))
        except ValueError:
            pass

# ---- Network utilities ----

def is_ignored(ip):
    """Return True if the IP falls within any IGNORE_NETWORKS range."""
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in net for net in IGNORE_NETWORKS)
    except ValueError:
        return False


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


# Prefer explicitly configured gateway, fall back to auto-detection.
GATEWAY_IP = os.getenv("GATEWAY_IP") or get_default_gateway()
if GATEWAY_IP:
    print(f"[INFO] Gateway IP: {GATEWAY_IP}")


def resolve_hostname(ip):
    """Reverse DNS lookup. Returns the hostname or the IP itself if unresolvable."""
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ip

# ---- Device detection ----

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
    # Web interface present but no Windows/printer ports → likely a router or AP.
    if (80 in open_ports or 443 in open_ports) and 445 not in open_ports:
        return "router"
    return "server"

# ---- Discovery ----

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
        futures = {ex.submit(_identify_device, ip): ip for ip in hosts if not is_ignored(ip)}
        for future in as_completed(futures):
            result = future.result()
            if result:
                alive.append(result)

    alive.sort(key=lambda d: ipaddress.ip_address(d["ip_address"]))
    print(f"Discovery found {len(alive)} device(s): {[d['ip_address'] for d in alive]}")
    return alive

# ---- Backend communication ----

def fetch_devices_from_backend():
    """Fetch all registered devices from the backend API.

    GET /api/v1/ingest/devices
    Returns the device list so the monitor knows what to poll.
    """
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
    """Return the active device list.

    If NETWORK_RANGE is set, ping-sweep + auto-detection is the source of truth.
    Devices already in the backend but outside the scanned range are merged in.
    Otherwise, fall back to the backend list only.
    """
    if NETWORK_RANGES:
        found = []
        for net_range in NETWORK_RANGES:
            found.extend(discover_devices(net_range))
        # Deduplicate by IP in case ranges overlap.
        seen = set()
        unique_found = []
        for d in found:
            if d["ip_address"] not in seen:
                seen.add(d["ip_address"])
                unique_found.append(d)
        backend_devices = fetch_devices_from_backend() or []
        # Include backend devices outside all scanned ranges that are not ignored.
        extra = [
            d for d in backend_devices
            if d["ip_address"] not in seen and not is_ignored(d["ip_address"])
        ]
        return unique_found + extra

    backend_devices = fetch_devices_from_backend()
    return backend_devices or []


def ping_device(ip):
    """Ping an IP and return (alive, rtt_ms, packet_loss_pct).

    Uses at least 3 probes so packet loss is meaningful.
    rtt_ms and packet_loss_pct are None when the host is completely unreachable.
    """
    import re
    ping_n = max(PING_COUNT, 3)   # need ≥3 probes for useful loss %
    try:
        is_win = platform.system().lower() == 'windows'
        param   = '-n' if is_win else '-c'
        command = ['ping', param, str(ping_n), ip]
        result  = subprocess.run(command, capture_output=True, text=True, timeout=PING_TIMEOUT + ping_n + 1)
        alive   = result.returncode == 0
        rtt     = None
        loss    = None

        if result.stdout:
            # RTT — Windows "Average = 5ms" / Linux "avg ... 5.32/"
            match = re.search(r'Average\s*=\s*(\d+)\s*ms', result.stdout)
            if not match:
                match = re.search(r'[Tt]ime[<=]\s*(\d+\.?\d*)\s*ms', result.stdout)
            if match:
                rtt = float(match.group(1))

            # Packet loss — Windows "Lost = N (X% loss)" / Linux "X% packet loss"
            loss_match = re.search(r'\((\d+)%\s*loss\)', result.stdout)
            if not loss_match:
                loss_match = re.search(r'(\d+)%\s*packet loss', result.stdout)
            if loss_match:
                loss = float(loss_match.group(1))
            elif not alive:
                loss = 100.0

        return alive, rtt, loss
    except Exception:
        return False, None, 100.0


# Ports to probe per device type.  The dict value is a human-readable label
# used as the 'unit' field so the backend can name alarms like
# "Port SSH(22) down (device:<id>)".
_PORT_PROBES: dict[str, list[tuple[int, str]]] = {
    "router":  [(22, "SSH(22)"), (23, "Telnet(23)"), (80, "HTTP(80)"), (443, "HTTPS(443)")],
    "switch":  [(22, "SSH(22)"), (23, "Telnet(23)"), (80, "HTTP(80)")],
    "server":  [(22, "SSH(22)"), (80, "HTTP(80)"), (443, "HTTPS(443)")],
    "printer": [(9100, "JetDirect(9100)"), (80, "HTTP(80)")],
    # Workstations are not port-scanned — closed RDP/SMB is normal and not actionable.
}


def check_device_ports(ip: str, device_type: str, timeout: float = 0.5) -> list[dict]:
    """Probe the well-known TCP ports for *device_type* and return port_status metrics.

    Each entry has value=1 (up) or value=0 (down).  The port label is stored in
    'unit' so the backend can build a meaningful per-port alarm name.
    """
    probes = _PORT_PROBES.get(device_type, [])
    metrics = []
    for port, label in probes:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            up = s.connect_ex((ip, port)) == 0
            s.close()
        except Exception:
            up = False
        metrics.append({"type": "port_status", "value": 1 if up else 0, "unit": label})
    return metrics


def send_passive_metrics(hostname, ip, device_type, rtt_ms, packet_loss_pct=None, snmp_metrics=None):
    """Push latency, packet_loss, availability, port-status, and SNMP metrics to the backend.

    POST /api/v1/ingest/metrics
    Bundles all per-device measurements into a single payload per cycle.
    """
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
    metrics = [{"type": "availability", "value": 1, "unit": "bool"}]
    if rtt_ms is not None:
        metrics.append({"type": "latency", "value": rtt_ms, "unit": "ms"})
    if packet_loss_pct is not None:
        metrics.append({"type": "packet_loss", "value": packet_loss_pct, "unit": "%"})
    metrics.extend(check_device_ports(ip, device_type))
    if snmp_metrics:
        metrics.extend(snmp_metrics)
    payload = {"hostname": hostname, "ip_address": ip, "device_type": device_type, "metrics": metrics}
    try:
        requests.post(f"{BACKEND_URL}/api/v1/ingest/metrics", json=payload, headers=headers, timeout=5)
    except Exception:
        pass


def send_heartbeat(hostname, ip, device_type):
    """Signal to the backend that a device is alive.

    POST /api/v1/ingest/heartbeat
    Called on every successful ping; the backend uses this to track last-seen time.
    """
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


def send_event(hostname, ip, device_type, event_type, description,
               severity="high", group="", resolve=False):
    """Post a structured event to fire or resolve an alarm.

    POST /api/v1/ingest/event
    When resolve=False the backend creates (or escalates) an alarm immediately.
    When resolve=True the backend closes the matching alarm — call this when the
    condition clears (e.g. device comes back online after an offline event).
    """
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
    payload = {
        "hostname":    hostname,
        "ip_address":  ip,
        "device_type": device_type,
        "event_type":  event_type,
        "severity":    severity,
        "group":       group,
        "description": description,
        "resolve":     resolve,
    }
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/v1/ingest/event",
            json=payload,
            headers=headers,
            timeout=5,
        )
        action = "resolved" if resolve else "fired"
        if response.status_code == 202:
            print(f"Event {action}: {event_type} for {hostname} ({ip}) — {description}")
        else:
            print(f"Event {action} failed for {hostname}: {response.status_code} {response.text}")
    except Exception as e:
        print(f"HTTP error sending event for {hostname}: {e}")

# ---- Monitoring loop ----

def main():
    devices = get_devices()
    print(f"Network monitor started... Monitoring {len(devices)} devices.")
    device_state = {}      # tracks consecutive failure count and offline flag per IP
    last_discovery = time.time()

    while True:
        # Refresh the device list periodically so newly added devices are picked up.
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
            alive, rtt_ms, packet_loss_pct = ping_device(ip)
            state = device_state.get(ip, {"failed": 0, "offline": False})

            if alive:
                if state["offline"]:
                    # Device has recovered — resolve the offline alarm.
                    print(f"Device recovered: {hostname} ({ip})")
                state["failed"] = 0
                state["offline"] = False
                send_heartbeat(hostname, ip, device_type)
                snmp_metrics = collect_snmp_metrics(ip, device_type)
                send_passive_metrics(hostname, ip, device_type, rtt_ms, packet_loss_pct, snmp_metrics)
            else:
                state["failed"] += 1
                # Fire an alarm only once per offline event (not on every failed ping).
                if state["failed"] >= OFFLINE_THRESHOLD and not state["offline"]:
                    print(f"Device offline detected: {hostname} ({ip})")
                    state["offline"] = True

            device_state[ip] = state

        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
