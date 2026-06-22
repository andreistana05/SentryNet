import unittest
from unittest.mock import patch

import monitor


class DiscoveryPolicyTests(unittest.TestCase):
    def test_unknown_is_not_accepted_for_auto_discovery(self):
        self.assertFalse(
            monitor.is_accepted_discovered_device(
                {"hostname": "phone-1", "ip_address": "10.0.0.50", "type": "unknown"}
            )
        )

    @patch("monitor.GATEWAY_IP", None)
    def test_server_hostname_prefix_is_server_evidence(self):
        self.assertEqual(monitor.detect_device_type("10.0.1.10", "app-server-01"), "server")
        self.assertEqual(monitor.detect_device_type("10.0.1.11", "db-primary"), "server")

    @patch("monitor.GATEWAY_IP", None)
    @patch("monitor.socket.socket")
    def test_server_service_port_is_server_evidence(self, socket_factory):
        class FakeSocket:
            def __init__(self, *_args, **_kwargs):
                pass

            def settimeout(self, _timeout):
                pass

            def connect_ex(self, address):
                _host, port = address
                return 0 if port == 5432 else 1

            def close(self):
                pass

        socket_factory.side_effect = FakeSocket

        self.assertEqual(monitor.detect_device_type("10.0.1.12", "unlabeled-host"), "server")

    @patch("monitor.GATEWAY_IP", None)
    @patch("monitor.socket.socket")
    def test_unlabeled_host_without_evidence_stays_unknown(self, socket_factory):
        class FakeSocket:
            def __init__(self, *_args, **_kwargs):
                pass

            def settimeout(self, _timeout):
                pass

            def connect_ex(self, _address):
                return 1

            def close(self):
                pass

        socket_factory.side_effect = FakeSocket

        self.assertEqual(monitor.detect_device_type("10.0.0.70", "android-phone"), "unknown")

    @patch("monitor.is_ignored", return_value=False)
    @patch("monitor._identify_device")
    def test_discovery_filters_unknown_hosts(self, identify_device, _is_ignored):
        def identify(ip):
            if ip.endswith(".1"):
                return {"hostname": "app-server-01", "ip_address": ip, "type": "server"}
            return {"hostname": "phone-1", "ip_address": ip, "type": "unknown"}

        identify_device.side_effect = identify

        devices = monitor.discover_devices("10.0.0.0/30")

        self.assertEqual(devices, [{"hostname": "app-server-01", "ip_address": "10.0.0.1", "type": "server"}])


if __name__ == "__main__":
    unittest.main()
