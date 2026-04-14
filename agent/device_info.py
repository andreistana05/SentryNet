import os
import socket
import platform


def get_ip_address():
    # Allow explicit override via env var (useful when Task Scheduler
    # detects a Docker bridge IP instead of the real LAN IP)
    override = os.getenv("AGENT_IP", "").strip()
    if override:
        return override

    try:
        # Connect to an external address (no data sent) to find the real outbound IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            hostname = socket.gethostname()
            return socket.gethostbyname(hostname)
        except Exception:
            return "127.0.0.1"


def get_device_type():
    system = platform.system().lower()

    if system in ["windows", "linux"]:
        return "workstation"

    return "server"


def get_device_info():
    return {
        "hostname": socket.gethostname(),
        "ip_address": get_ip_address(),
        "device_type": get_device_type()
    }