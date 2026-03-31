import requests


def send_metrics(base_url, api_key, device_info, metrics, timeout=5):
    url = f"{base_url}/metrics"

    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "hostname": device_info["hostname"],
        "ip_address": device_info["ip_address"],
        "type": device_info["device_type"],
        "metrics": metrics
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        print(f"[ERROR] Failed to send metrics: {exc}")
        return None


def send_heartbeat(base_url, api_key, device_info, timeout=5):
    url = f"{base_url}/heartbeat"

    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "hostname": device_info["hostname"],
        "ip_address": device_info["ip_address"],
        "type": device_info["device_type"]
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        print(f"[ERROR] Failed to send heartbeat: {exc}")
        return None