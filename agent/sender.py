"""
HTTP sender for the SentryNet agent.

Posts metric batches and heartbeats to the backend ingest API.
Both functions retry once on transient network failures; HTTP 4xx errors
are not retried because they indicate a client-side problem.
"""
import requests
import time
import logging

def send_metrics(base_url, api_key, device_info, metrics, timeout=5):
    """Send a batch of collected metrics to the backend ingest endpoint.

    Retries once on transient network failures. Returns True on success,
    False after all attempts are exhausted or on a non-retryable HTTP error.
    """
    url = f"{base_url}/metrics"

    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "hostname": device_info["hostname"],
        "ip_address": device_info["ip_address"],
        "device_type": device_info["device_type"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metrics": metrics
    }

    for attempt in range(2):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=timeout)
            response.raise_for_status()

            logging.info("Metrics sent successfully")
            return True
        
        except requests.exceptions.Timeout:
            logging.warning(f"Attempt {attempt+1}: Request timed out")
        
        except requests.exceptions.ConnectionError:
            logging.error(f"Attempt {attempt+1}: Backend unreachable")

        except requests.exceptions.HTTPError as e:
            logging.error(f"Attempt {attempt+1}: HTTP error {response.status_code} - {response.text}")
            return False  # don't retry on bad request

        except Exception as e:
            logging.error(f"Attempt {attempt+1}: Unexpected error: {e}")

        time.sleep(2)
    return False

def send_heartbeat(base_url, api_key, device_info, timeout=5):
    """Send a lightweight heartbeat to signal that this device is alive.

    Retries once on transient failures. Returns True on success, False otherwise.
    """
    url = f"{base_url}/heartbeat"

    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "hostname": device_info["hostname"],
        "ip_address": device_info["ip_address"],
        "device_type": device_info["device_type"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    for attempt in range(2):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=timeout)
            response.raise_for_status()
            
            logging.info("Heartbeat sent successfully")
            return True
        except requests.exceptions.Timeout:
                logging.warning(f"Heartbeat attempt {attempt+1}: Request timed out")

        except requests.exceptions.ConnectionError:
            logging.error(f"Heartbeat attempt {attempt+1}: Backend unreachable")

        except requests.exceptions.HTTPError:
            logging.error(f"Heartbeat attempt {attempt+1}: HTTP error {response.status_code} - {response.text}")
            return False  # don't retry bad request

        except Exception as e:
            logging.error(f"Heartbeat attempt {attempt+1}: Unexpected error: {e}")

        time.sleep(2)
    return False