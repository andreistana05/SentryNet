"""
HTTP sender for the SentryNet agent.

Posts metric batches and heartbeats to the backend ingest API.
Both functions retry once on transient network failures; HTTP 4xx errors
are not retried because they indicate a client-side problem.
"""
import requests
import time
import logging


def _headers(api_key):
    return {
        "X-API-Key": api_key,
        "Content-Type": "application/json",
    }


def _post_json(url, payload, headers, timeout, label):
    """POST JSON with one retry for network errors and HTTP 5xx responses."""
    for attempt in range(1, 3):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=timeout)

            if 200 <= response.status_code < 300:
                logging.info("%s sent successfully to %s", label, url)
                return True

            logging.error(
                "%s attempt %s: HTTP %s from %s - %s",
                label,
                attempt,
                response.status_code,
                url,
                response.text,
            )

            if response.status_code < 500:
                return False

        except requests.exceptions.Timeout:
            logging.warning("%s attempt %s: request timed out for %s", label, attempt, url)

        except requests.exceptions.ConnectionError:
            logging.error("%s attempt %s: backend unreachable at %s", label, attempt, url)

        except requests.exceptions.RequestException as exc:
            logging.error("%s attempt %s: request failed for %s: %s", label, attempt, url, exc)
            return False

        except Exception as exc:
            logging.error("%s attempt %s: unexpected error for %s: %s", label, attempt, url, exc)
            return False

        if attempt < 2:
            time.sleep(2)

    return False


def send_metrics(base_url, api_key, device_info, metrics, timeout=5):
    """Send a batch of collected metrics to the backend ingest endpoint."""
    url = f"{base_url}/metrics"
    payload = {
        "hostname": device_info["hostname"],
        "ip_address": device_info["ip_address"],
        "device_type": device_info["device_type"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metrics": metrics
    }

    return _post_json(url, payload, _headers(api_key), timeout, "Metrics")


def send_heartbeat(base_url, api_key, device_info, timeout=5):
    """Send a lightweight heartbeat to signal that this device is alive."""
    url = f"{base_url}/heartbeat"
    payload = {
        "hostname": device_info["hostname"],
        "ip_address": device_info["ip_address"],
        "device_type": device_info["device_type"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    return _post_json(url, payload, _headers(api_key), timeout, "Heartbeat")
