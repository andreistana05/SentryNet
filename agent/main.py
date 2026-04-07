import time
import logging

from collector import collect_metrics
from device_info import get_device_info
from sender import send_metrics, send_heartbeat
from config import load_config


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

def main():
    config = load_config()
    device_info = get_device_info()

    base_url = config["base_url"]
    api_key = config["api_key"]
    metrics_interval = config["metrics_interval"]
    heartbeat_interval = config["heartbeat_interval"]
    timeout = config["timeout"]

    logging.info("Agent started")
    logging.info(f"Device: {device_info}")

    last_heartbeat_time = 0

    while True:
        current_time = time.time()

        if current_time - last_heartbeat_time >= heartbeat_interval:
            heartbeat_response = send_heartbeat(base_url, api_key, device_info, timeout)
            logging.info(f"[HEARTBEAT] {heartbeat_response}")
            last_heartbeat_time = current_time

        metrics = collect_metrics()
        metrics_response = send_metrics(base_url, api_key, device_info, metrics, timeout)
        logging.info(f"[METRICS] {metrics_response}")

        time.sleep(metrics_interval)


if __name__ == "__main__":
    main()