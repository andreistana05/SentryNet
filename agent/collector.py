import os
import time
import psutil


def collect_metrics():
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(os.path.abspath(os.sep))
    uptime_seconds = int(time.time() - psutil.boot_time())

    metrics = [
        {
            "type": "cpu_usage",
            "value": psutil.cpu_percent(interval=1),
            "unit": "%"
        },
        {
            "type": "ram_usage",
            "value": memory.percent,
            "unit": "%"
        },
        {
            "type": "disk_usage",
            "value": disk.percent,
            "unit": "%"
        },
        {
            "type": "uptime",
            "value": uptime_seconds,
            "unit": "seconds"
        }
    ]

    return metrics


if __name__ == "__main__":
    while True:
        print(collect_metrics())
        print("-" * 40)
        time.sleep(5)