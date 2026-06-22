"""
SentryNet Agent – Module 1.

Runs on each monitored host and periodically pushes metric snapshots and
heartbeat signals to the SentryNet backend via the ingest API.
"""
import time
import logging
from datetime import datetime

from collector import collect_metrics
from device_info import get_device_info
from sender import send_metrics, send_heartbeat
from config import load_config

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.WARNING,
)


def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{ts} {msg}", flush=True)


def main():
    """Load the effective config, discover device identity, then send data forever."""
    config = load_config()
    device_info = get_device_info(config)

    base_url = config["base_url"]
    api_key = config["api_key"]
    metrics_interval = config["metrics_interval"]
    heartbeat_interval = config["heartbeat_interval"]
    timeout = config["timeout"]

    log("[INFO] Agent started")
    log(f"[INFO] Backend URL: {base_url}")
    log(f"[INFO] Device: {device_info}")

    last_heartbeat_time = 0

    while True:
        current_time = time.time()

        # Heartbeats and metrics intentionally share one loop so the agent keeps
        # a single source of truth for timing and does not need extra threads.
        if current_time - last_heartbeat_time >= heartbeat_interval:
            heartbeat_response = send_heartbeat(base_url, api_key, device_info, timeout)
            log(f"[HEARTBEAT] {heartbeat_response}")
            last_heartbeat_time = current_time

        metrics = collect_metrics()
        metrics_response = send_metrics(base_url, api_key, device_info, metrics, timeout)
        log(f"[METRICS] {metrics_response}")

        time.sleep(metrics_interval)


if __name__ == "__main__":
    main()
