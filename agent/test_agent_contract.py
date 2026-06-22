import json
import logging
import os
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import config as agent_config
import device_info
import sender


def setUpModule():
    logging.disable(logging.CRITICAL)


def tearDownModule():
    logging.disable(logging.NOTSET)


class ConfigContractTests(unittest.TestCase):
    def setUp(self):
        self._env = patch.dict(os.environ, {}, clear=True)
        self._env.start()
        self.config_path = Path(__file__).with_name(".tmp") / "test-agent-config.json"
        self.config_path.parent.mkdir(exist_ok=True)
        try:
            self.config_path.unlink()
        except FileNotFoundError:
            pass
        self._config_path = patch.object(agent_config, "CONFIG_PATH", self.config_path)
        self._config_path.start()

    def tearDown(self):
        self._config_path.stop()
        try:
            self.config_path.unlink()
        except FileNotFoundError:
            pass
        self._env.stop()

    def test_defaults_match_backend_ingest_contract(self):
        config = agent_config.load_config()

        self.assertEqual(config["backend_url"], "http://127.0.0.1:8080")
        self.assertEqual(config["base_url"], "http://127.0.0.1:8080/api/v1/ingest")
        self.assertEqual(config["api_key"], "change-me-ingest-key")
        self.assertEqual(config["device_type_override"], "auto")

    def test_save_and_load_device_type_override(self):
        agent_config.save_config(
            {
                "backend_url": "http://backend.local:8080/",
                "api_key": "agent-key",
                "metrics_interval": 15,
                "heartbeat_interval": 45,
                "timeout": 7,
                "device_type_override": "workstation",
            }
        )

        saved = json.loads(self.config_path.read_text(encoding="utf-8"))
        loaded = agent_config.load_config()

        self.assertEqual(saved["backend_url"], "http://backend.local:8080")
        self.assertEqual(loaded["base_url"], "http://backend.local:8080/api/v1/ingest")
        self.assertEqual(loaded["device_type_override"], "workstation")


class DeviceInfoContractTests(unittest.TestCase):
    def test_device_type_override_takes_precedence(self):
        self.assertEqual(device_info.get_device_type({"device_type_override": "server"}), "server")
        self.assertEqual(device_info.get_device_type({"device_type_override": "workstation"}), "workstation")


class SenderContractTests(unittest.TestCase):
    def _response(self, status_code, text=""):
        response = Mock()
        response.status_code = status_code
        response.text = text
        return response

    @patch.object(sender.time, "sleep")
    @patch.object(sender.requests, "post")
    def test_metrics_retry_server_error_once(self, post, _sleep):
        post.side_effect = [self._response(500, "temporary"), self._response(202, "accepted")]

        sent = sender.send_metrics(
            "http://backend/api/v1/ingest",
            "agent-key",
            {"hostname": "host-a", "ip_address": "10.0.0.10", "device_type": "workstation"},
            [{"type": "cpu_usage", "value": 50, "unit": "%"}],
        )

        self.assertTrue(sent)
        self.assertEqual(post.call_count, 2)
        self.assertEqual(post.call_args.args[0], "http://backend/api/v1/ingest/metrics")
        self.assertEqual(post.call_args.kwargs["headers"]["X-API-Key"], "agent-key")

    @patch.object(sender.time, "sleep")
    @patch.object(sender.requests, "post")
    def test_heartbeat_does_not_retry_client_error(self, post, _sleep):
        post.return_value = self._response(401, "invalid API key")

        sent = sender.send_heartbeat(
            "http://backend/api/v1/ingest",
            "bad-key",
            {"hostname": "host-a", "ip_address": "10.0.0.10", "device_type": "server"},
        )

        self.assertFalse(sent)
        self.assertEqual(post.call_count, 1)


if __name__ == "__main__":
    unittest.main()
