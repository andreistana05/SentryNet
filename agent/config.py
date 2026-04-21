import os

DEFAULT_BACKEND_URL = "http://127.0.0.1:8080"
DEFAULT_INGEST_API_KEY = "sk-infrapulse-7f3Kx9mQpL2wNvR8dYcT4jZbHnUeA6sW"
DEFAULT_METRICS_INTERVAL = 10
DEFAULT_HEARTBEAT_INTERVAL = 30
DEFAULT_TIMEOUT = 5


def load_config():
    backend_url = os.getenv("BACKEND_URL", DEFAULT_BACKEND_URL)
    return {
        "base_url": backend_url.rstrip("/") + "/api/v1/ingest",
        "api_key": os.getenv("INGEST_API_KEY", DEFAULT_INGEST_API_KEY),
        "metrics_interval": int(os.getenv("METRICS_INTERVAL", str(DEFAULT_METRICS_INTERVAL))),
        "heartbeat_interval": int(os.getenv("HEARTBEAT_INTERVAL", str(DEFAULT_HEARTBEAT_INTERVAL))),
        "timeout": int(os.getenv("TIMEOUT", str(DEFAULT_TIMEOUT))),
    }
