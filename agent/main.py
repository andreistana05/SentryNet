import time

from collector import collect_metrics
from device_info import get_device_info
from sender import send_metrics, send_heartbeat
from config import load_config


def main():
    config = load_config()
    device_info = get_device_info()

    base_url = config["base_url"]
    api_key = config["api_key"]
    metrics_interval = config["metrics_interval"]
    heartbeat_interval = config["heartbeat_interval"]
    timeout = config["timeout"]

    print("[INFO] Agent started")
    print(f"[INFO] Device: {device_info}")

    last_heartbeat_time = 0

    while True:
        current_time = time.time()

        if current_time - last_heartbeat_time >= heartbeat_interval:
            heartbeat_response = send_heartbeat(base_url, api_key, device_info, timeout)
            print("[HEARTBEAT]", heartbeat_response)
            last_heartbeat_time = current_time

        metrics = collect_metrics()
        metrics_response = send_metrics(base_url, api_key, device_info, metrics, timeout)
        print("[METRICS]", metrics_response)

        time.sleep(metrics_interval)


if __name__ == "__main__":
    main()