import os
import socket
import platform
import subprocess


def _run_command(command): # helper to run a command and return its output
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10,
            check=False
        )
        return (result.stdout or "").strip()
    except Exception:
        return ""

def get_ip_address(): # attempts to find the real LAN IP address
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

def detect_windows_device_type(): # heuristic to determine if a Windows machine is a server or workstation
    score_server = 0
    score_workstation = 0

    # 1 = Workstation, 2/3 = Server
    output = _run_command([
        "powershell",
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_OperatingSystem).ProductType"
    ])

    if output == "1":
        score_workstation += 5
    elif output in {"2", "3"}:
        score_server += 5

    # OS name check
    caption = _run_command([
        "powershell",
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_OperatingSystem).Caption"
    ]).lower()

    if "server" in caption:
        score_server += 5
    elif "windows 10" in caption or "windows 11" in caption:
        score_workstation += 2

    # GUI presence check
    explorer = _run_command([
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-Process explorer -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessName"
    ]).lower()

    if explorer == "explorer":
        score_workstation += 1

    return "server" if score_server > score_workstation else "workstation"

def _read_os_release(): # helper to read Linux OS info from standard files
    paths = ["/etc/os-release", "/usr/lib/os-release"]
    data = {}

    for path in paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if "=" in line and not line.startswith("#"):
                            k, v = line.split("=", 1)
                            data[k] = v.strip().strip('"')
                break
            except Exception:
                pass

    return data

def detect_linux_device_type(): # heuristic to determine if a Linux machine is a server or workstation
    score_server = 0
    score_workstation = 0

    os_release = _read_os_release()
    os_text = " ".join(os_release.values()).lower()

    # Desktop distro hints
    desktop_keywords = [
        "ubuntu desktop", "pop", "mint", "fedora workstation",
        "kubuntu", "xubuntu", "lubuntu", "zorin"
    ]
    if any(word in os_text for word in desktop_keywords):
        score_workstation += 2

    # Server distro hints
    server_keywords = [
        "ubuntu server", "debian", "rhel", "rocky",
        "almalinux", "centos", "oracle linux", "sles"
    ]
    if any(word in os_text for word in server_keywords):
        score_server += 2

    # GUI environment check
    if os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"):
        score_workstation += 3
    else: score_server += 2

    # Desktop sessions installed?
    desktop_dirs = ["/usr/share/xsessions", "/usr/share/wayland-sessions"]
    has_desktop_sessions = False
    for path in desktop_dirs:
        if os.path.isdir(path) and os.listdir(path):
            has_desktop_sessions = True
            break

    if has_desktop_sessions:
        score_workstation += 2
    else:
        score_server += 2

    # Running processes check
    process_list = _run_command(["ps", "-e", "-o", "comm="]).lower()

    desktop_processes = [
        "gnome-shell", "plasmashell", "xfce4-session",
        "cinnamon", "mate-session"
    ]
    desktop_matches = sum(1 for proc in desktop_processes if proc in process_list)
    score_workstation += min(desktop_matches, 3)

    server_services = [
        "sshd", "nginx", "apache2", "httpd",
        "mysqld", "postgres", "docker", "containerd", "libvirtd"
    ]
    server_matches = sum(1 for service in server_services if service in process_list)
    score_server += min(server_matches, 3)

    return "server" if score_server > score_workstation else "workstation"

def get_device_type(config=None):
    # Optional override
    if config and config.get("device_type_override") in {"server", "workstation"}:
        return config["device_type_override"]

    system = platform.system().lower()

    if system == "windows":
        return detect_windows_device_type()

    if system == "linux":
        return detect_linux_device_type()

    return "workstation"

def get_device_info():
    return {
        "hostname": socket.gethostname(),
        "ip_address": get_ip_address(),
        "device_type": get_device_type()
    }