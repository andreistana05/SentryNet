import socket
import platform


def get_ip_address():
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