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

    return metrics


if __name__ == "__main__":
    while True:
        print(collect_metrics())
        print("-" * 40)
        time.sleep(5)
