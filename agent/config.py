"""Configuration loading and persistence for the SentryNet agent.

config.py stores the built-in defaults and the logic for reading overrides.
config.json stores the user- or GUI-saved settings for a specific machine.
Effective precedence is:
1. environment variables
2. config.json
3. defaults in this file
"""
import json
import os
from pathlib import Path

DEFAULT_BACKEND_URL = "http://127.0.0.1:8080"
DEFAULT_INGEST_API_KEY = "change-me-ingest-key"
DEFAULT_METRICS_INTERVAL = 10
DEFAULT_HEARTBEAT_INTERVAL = 30
DEFAULT_TIMEOUT = 5
DEVICE_TYPE_OPTIONS = {"auto", "server", "workstation"}

CONFIG_PATH = Path(__file__).with_name("config.json")


def _read_file_config():
    """Read config.json if it exists, otherwise return an empty config."""
    if not CONFIG_PATH.exists():
        return {}

    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}

    return data if isinstance(data, dict) else {}


def save_config(settings):
    """Persist the editable runtime settings to config.json."""
    device_type_override = settings.get("device_type_override", "auto")
    if device_type_override not in DEVICE_TYPE_OPTIONS:
        device_type_override = "auto"

    file_settings = {
        "backend_url": settings["backend_url"].strip().rstrip("/"),
        "api_key": settings["api_key"].strip(),
        "metrics_interval": int(settings["metrics_interval"]),
        "heartbeat_interval": int(settings["heartbeat_interval"]),
        "timeout": int(settings["timeout"]),
        "device_type_override": device_type_override,
    }

    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump(file_settings, f, indent=2)
        f.write("\n")

    return file_settings


def load_config():
    """Return the effective runtime config after applying precedence rules."""
    file_config = _read_file_config()
    # Precedence is env var -> config.json -> hard-coded default so packaged
    # installs can be centrally overridden without editing files on disk.
    backend_url = os.getenv(
        "BACKEND_URL",
        file_config.get("backend_url", DEFAULT_BACKEND_URL),
    )
    device_type_override = os.getenv(
        "DEVICE_TYPE_OVERRIDE",
        file_config.get("device_type_override", "auto"),
    )
    if device_type_override not in DEVICE_TYPE_OPTIONS:
        device_type_override = "auto"

    return {
        "backend_url": backend_url.rstrip("/"),
        "base_url": backend_url.rstrip("/") + "/api/v1/ingest",
        "api_key": os.getenv(
            "INGEST_API_KEY",
            file_config.get("api_key", DEFAULT_INGEST_API_KEY),
        ),
        "metrics_interval": int(os.getenv(
            "METRICS_INTERVAL",
            str(file_config.get("metrics_interval", DEFAULT_METRICS_INTERVAL)),
        )),
        "heartbeat_interval": int(os.getenv(
            "HEARTBEAT_INTERVAL",
            str(file_config.get("heartbeat_interval", DEFAULT_HEARTBEAT_INTERVAL)),
        )),
        "timeout": int(os.getenv(
            "TIMEOUT",
            str(file_config.get("timeout", DEFAULT_TIMEOUT)),
        )),
        "device_type_override": device_type_override,
    }
