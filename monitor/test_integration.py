"""
Integration tests for Network & Device Monitor (Module 4).
Tests verify that events are sent correctly to the backend.

Run with: python -m pytest test_integration.py -v
Requires: pip install pytest
"""

import json
import sys
import unittest
from unittest.mock import patch, MagicMock, call

import monitor


class TestPingDevice(unittest.TestCase):
    def test_ping_alive(self):
        with patch("monitor.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            result = monitor.ping_device("127.0.0.1")
        self.assertTrue(result)

    def test_ping_dead(self):
        with patch("monitor.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=1)
            result = monitor.ping_device("192.0.2.1")
        self.assertFalse(result)

    def test_ping_exception_returns_false(self):
        with patch("monitor.subprocess.run", side_effect=Exception("timeout")):
            result = monitor.ping_device("192.0.2.1")
        self.assertFalse(result)


class TestSendHeartbeat(unittest.TestCase):
    def test_heartbeat_payload_fields(self):
        """Heartbeat must send device_type (not type) to match backend schema."""
        with patch("monitor.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=200)
            monitor.send_heartbeat("router1", "192.168.1.1", "router")

        args, kwargs = mock_post.call_args
        sent_json = kwargs.get("json", {})
        self.assertIn("device_type", sent_json, "Field must be 'device_type', not 'type'")
        self.assertNotIn("type", sent_json, "Wrong field name 'type' should not be present")
        self.assertEqual(sent_json["device_type"], "router")
        self.assertEqual(sent_json["hostname"], "router1")
        self.assertEqual(sent_json["ip_address"], "192.168.1.1")

    def test_heartbeat_uses_api_key_header(self):
        with patch("monitor.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=200)
            monitor.send_heartbeat("host", "1.2.3.4", "server")

        _, kwargs = mock_post.call_args
        self.assertIn("X-API-Key", kwargs.get("headers", {}))


class TestSendErrorEvent(unittest.TestCase):
    def test_error_event_payload(self):
        with patch("monitor.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=202)
            monitor.send_error_event("switch1", "10.0.0.1", "switch", "ping_failure", "Device failed ping threshold")

        _, kwargs = mock_post.call_args
        payload = kwargs.get("json", {})
        self.assertEqual(payload["hostname"], "switch1")
        self.assertEqual(payload["ip_address"], "10.0.0.1")
        self.assertEqual(payload["device_type"], "switch")
        self.assertIsInstance(payload["metrics"], list)
        self.assertEqual(len(payload["metrics"]), 1)
        metric = payload["metrics"][0]
        self.assertEqual(metric["type"], "ping_failure")
        self.assertEqual(metric["value"], 1)

    def test_error_event_endpoint(self):
        with patch("monitor.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=202)
            monitor.send_error_event("h", "1.1.1.1", "server", "ping_failure", "msg")

        url = mock_post.call_args[0][0]
        self.assertIn("/ingest/metrics", url)


class TestOfflineDetection(unittest.TestCase):
    """Test that offline state is tracked correctly across monitor cycles."""

    def _run_cycles(self, ping_results, threshold=3):
        """Simulate monitor cycles with given ping results (list of bool)."""
        devices = [{"hostname": "host1", "ip_address": "10.0.0.1", "type": "server"}]
        device_state = {}

        with patch("monitor.OFFLINE_THRESHOLD", threshold), \
             patch("monitor.send_heartbeat") as mock_hb, \
             patch("monitor.send_error_event") as mock_err, \
             patch("monitor.ping_device", side_effect=ping_results):

            for _ in ping_results:
                for device in devices:
                    ip = device["ip_address"]
                    hostname = device.get("hostname", ip)
                    device_type = device.get("type", "server")
                    alive = monitor.ping_device(ip)
                    state = device_state.get(ip, {"failed": 0, "offline": False})

                    if alive:
                        if state["offline"]:
                            pass  # recovered
                        state["failed"] = 0
                        state["offline"] = False
                        monitor.send_heartbeat(hostname, ip, device_type)
                    else:
                        state["failed"] += 1
                        if state["failed"] >= monitor.OFFLINE_THRESHOLD:
                            if not state["offline"]:
                                state["offline"] = True
                            monitor.send_error_event(hostname, ip, device_type, "ping_failure", "failed")

                    device_state[ip] = state

        return mock_hb, mock_err, device_state

    def test_offline_event_sent_only_after_threshold(self):
        # 2 failures then 1 success — threshold=3, no error should be sent
        mock_hb, mock_err, _ = self._run_cycles([False, False, True], threshold=3)
        mock_err.assert_not_called()
        mock_hb.assert_called_once()

    def test_offline_event_sent_at_threshold(self):
        # exactly 3 failures — error event must fire
        mock_hb, mock_err, _ = self._run_cycles([False, False, False], threshold=3)
        mock_err.assert_called_once()

    def test_offline_state_set_after_threshold(self):
        _, _, state = self._run_cycles([False, False, False], threshold=3)
        self.assertTrue(state["10.0.0.1"]["offline"])

    def test_heartbeat_sent_when_online(self):
        mock_hb, _, _ = self._run_cycles([True, True], threshold=3)
        self.assertEqual(mock_hb.call_count, 2)


class TestLoadDevices(unittest.TestCase):
    def test_load_valid_json(self):
        data = [{"hostname": "h1", "ip_address": "1.2.3.4", "type": "server"}]
        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps(data))):
            devices = monitor.load_devices()
        self.assertEqual(len(devices), 1)
        self.assertEqual(devices[0]["hostname"], "h1")

    def test_load_missing_file_returns_defaults(self):
        with patch("builtins.open", side_effect=FileNotFoundError):
            devices = monitor.load_devices()
        self.assertGreater(len(devices), 0)


if __name__ == "__main__":
    unittest.main()
