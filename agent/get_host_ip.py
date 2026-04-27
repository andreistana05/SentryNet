"""
Utility script that prints the machine's primary outbound IP address.

Opens a UDP socket to an external address (no data is actually sent) so the
OS selects the correct outbound interface, then reads the local address.
Useful for diagnosing which IP the agent will report to the backend.
"""
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.connect(("8.8.8.8", 80))
print(s.getsockname()[0])
s.close()
