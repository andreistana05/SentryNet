import os
import time
import platform
import socket
import subprocess
import psutil


def collect_temperature():
    """Return CPU temperature in Celsius, or None if unavailable."""
    # psutil sensors — works on Linux/macOS
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for entries in temps.values():
                for entry in entries:
                    if entry.current and entry.current > 0:
                        return round(entry.current, 1)
    except (AttributeError, Exception):
        pass

    # Windows: WMI thermal zone (value is in tenths of Kelvin)
    if platform.system().lower() == "windows":
        try:
            result = subprocess.run(
                [
                    "powershell", "-NoProfile", "-Command",
                    "Get-WmiObject -Namespace root/wmi -Class MSAcpi_ThermalZoneTemperature"
                    " | Select-Object -ExpandProperty CurrentTemperature",
                ],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    celsius = (float(line) / 10.0) - 273.15
                    if 0 < celsius < 150:
                        return round(celsius, 1)
                except ValueError:
                    continue
        except Exception:
            pass

    return None


def collect_latency(timeout=3):
    """
    Measure network latency by timing a TCP connection to a well-known host.
    Tries multiple hosts/ports so firewall rules on a specific port don't
    prevent a reading.  Returns RTT in milliseconds, or None.
    """
    candidates = [
        ("8.8.8.8",  443),   # Google HTTPS
        ("1.1.1.1",  443),   # Cloudflare HTTPS
        ("8.8.8.8",  80),    # Google HTTP
        ("1.1.1.1",  80),    # Cloudflare HTTP
    ]
    for host, port in candidates:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            start = time.perf_counter()
            s.connect((host, port))
            elapsed_ms = (time.perf_counter() - start) * 1000
            s.close()
            return round(elapsed_ms, 1)
        except Exception:
            continue
    return None


# Module-level snapshot of per-NIC I/O counters from the previous collection
# cycle.  Used to compute the delta (errors/drops added since last check).
_prev_net_counters: dict = {}


def collect_network_errors():
    """
    Return a network_errors metric for every non-loopback interface that has
    accumulated new I/O errors or dropped packets since the last call.
    value = total new error/drop events (errin + errout + dropin + dropout).
    The interface name is in 'unit' so per-interface alarms are possible.
    """
    global _prev_net_counters
    metrics = []
    try:
        current = psutil.net_io_counters(pernic=True)
        for iface, counters in current.items():
            if iface.lower() in ("lo", "loopback") or iface.lower().startswith("lo0"):
                continue
            prev = _prev_net_counters.get(iface)
            if prev is not None:
                delta = (
                    (counters.errin  - prev.errin)
                    + (counters.errout - prev.errout)
                    + (counters.dropin  - prev.dropin)
                    + (counters.dropout - prev.dropout)
                )
                # Guard against counter resets (reboot / interface restart).
                delta = max(delta, 0)
                if delta > 0:
                    metrics.append({
                        "type": "network_errors",
                        "value": float(delta),
                        "unit": iface,
                    })
        _prev_net_counters = current
    except Exception:
        pass
    return metrics


def collect_port_status():
    """
    Return a port_status metric for every non-loopback network interface.
    value=1 means the interface is up, value=0 means it is down.
    The interface name is carried in the 'unit' field so the backend can
    generate a per-port alarm (e.g. "Port eth0 down").
    """
    metrics = []
    try:
        stats = psutil.net_if_stats()
        for iface, info in stats.items():
            # Skip loopback interfaces
            if iface.lower() in ("lo", "loopback") or iface.lower().startswith("lo0"):
                continue
            metrics.append({
                "type": "port_status",
                "value": 1 if info.isup else 0,
                "unit": iface,
            })
    except Exception:
        pass
    return metrics


def collect_metrics():
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(os.path.abspath(os.sep))
    uptime_seconds = int(time.time() - psutil.boot_time())

    metrics = [
        {"type": "cpu_usage",  "value": psutil.cpu_percent(interval=1), "unit": "%"},
        {"type": "ram_usage",  "value": memory.percent,                 "unit": "%"},
        {"type": "disk_usage", "value": disk.percent,                   "unit": "%"},
        {"type": "uptime",     "value": uptime_seconds,                 "unit": "seconds"},
    ]

    temp = collect_temperature()
    if temp is not None:
        metrics.append({"type": "temperature", "value": temp, "unit": "C"})

    latency = collect_latency()
    if latency is not None:
        metrics.append({"type": "latency", "value": latency, "unit": "ms"})

    metrics.extend(collect_port_status())
    metrics.extend(collect_network_errors())

    return metrics


if __name__ == "__main__":
    while True:
        print(collect_metrics())
        print("-" * 40)
        time.sleep(5)
