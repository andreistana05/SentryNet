import os

def load_config():
    backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8080")
    return {
        "base_url": backend_url.rstrip("/") + "/api/v1/ingest",
        "api_key": os.getenv("INGEST_API_KEY", "sk-infrapulse-7f3Kx9mQpL2wNvR8dYcT4jZbHnUeA6sW"),
        "metrics_interval": int(os.getenv("METRICS_INTERVAL", "10")),
        "heartbeat_interval": int(os.getenv("HEARTBEAT_INTERVAL", "30")),
        "timeout": int(os.getenv("TIMEOUT", "5")),
    }
