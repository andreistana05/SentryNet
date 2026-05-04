"""
SNMP Connectivity Test — run this to verify the SNMP collector works.

Usage:
    python snmp_test.py                              # auto-detects your gateway
    python snmp_test.py 192.168.1.1                  # test a specific IP
    python snmp_test.py 192.168.1.1 public           # custom community string
    python snmp_test.py 192.168.1.50 public printer  # test a printer device

What it does:
    Polls each standard OID individually and prints a pass/fail result.
    At the end it calls collect_snmp_metrics() to show the exact output
    that the monitor would send to the backend.
"""
import sys
import asyncio
import platform
import subprocess

# ---- Target resolution ----

def get_gateway():
    """Auto-detect the default gateway to use as the test target."""
    try:
        if platform.system().lower() == "windows":
            out = subprocess.run(["ipconfig"], capture_output=True, text=True).stdout
            for line in out.splitlines():
                if "Default Gateway" in line:
                    parts = line.split(":", 1)
                    if len(parts) > 1:
                        gw = parts[1].strip()
                        if gw:
                            return gw
        else:
            out = subprocess.run(["ip", "route"], capture_output=True, text=True).stdout
            for line in out.splitlines():
                if line.startswith("default"):
                    parts = line.split()
                    if len(parts) > 2:
                        return parts[2]
    except Exception:
        pass
    return None


# ---- OIDs to test ----

TESTS_STANDARD = [
    ("sysUpTime",       "1.3.6.1.2.1.1.3.0",      "GET",  "Uptime in hundredths of a second"),
    ("sysDescr",        "1.3.6.1.2.1.1.1.0",      "GET",  "Device description string"),
    ("sysName",         "1.3.6.1.2.1.1.5.0",      "GET",  "Device hostname"),
    ("hrProcessorLoad", "1.3.6.1.2.1.25.3.3.1.2", "WALK", "CPU load per processor (%)"),
    ("ifInOctets",      "1.3.6.1.2.1.2.2.1.10",   "WALK", "Inbound octets per interface"),
    ("ifOutOctets",     "1.3.6.1.2.1.2.2.1.16",   "WALK", "Outbound octets per interface"),
]

TESTS_PRINTER = [
    ("prtMarkerSuppliesLevel (toner)", "1.3.6.1.2.1.43.11.1.1.9.1.1", "GET", "Toner cartridge level"),
    ("prtMarkerSuppliesMaxCapacity",   "1.3.6.1.2.1.43.11.1.1.8.1.1", "GET", "Toner max capacity"),
    ("prtMarkerSuppliesLevel (drum)",  "1.3.6.1.2.1.43.11.1.1.9.1.2", "GET", "Drum cartridge level"),
    ("prtInputCurrentLevel (paper)",   "1.3.6.1.2.1.43.8.2.1.10.1.1", "GET", "Paper tray level"),
    ("prtInputMaxCapacity (paper)",    "1.3.6.1.2.1.43.8.2.1.9.1.1",  "GET", "Paper tray max capacity"),
]

# ---- SNMP helpers ----

async def snmp_get(ip, oid, community, port=161, timeout=3, retries=1):
    from pysnmp.hlapi.v3arch.asyncio import (
        get_cmd, SnmpEngine, CommunityData,
        UdpTransportTarget, ContextData, ObjectType, ObjectIdentity,
    )
    transport = await UdpTransportTarget.create(
        (ip, port), timeout=timeout, retries=retries
    )
    err_ind, err_status, _, var_binds = await get_cmd(
        SnmpEngine(),
        CommunityData(community, mpModel=1),
        transport,
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
    )
    if err_ind:
        raise RuntimeError(f"engine error: {err_ind}")
    if err_status:
        raise RuntimeError(f"SNMP error: {err_status.prettyPrint()}")
    return [(str(vb[0]), vb[1]) for vb in var_binds]


async def snmp_walk(ip, oid, community, port=161, timeout=3, retries=1):
    from pysnmp.hlapi.v3arch.asyncio import (
        walk_cmd, SnmpEngine, CommunityData,
        UdpTransportTarget, ContextData, ObjectType, ObjectIdentity,
    )
    transport = await UdpTransportTarget.create(
        (ip, port), timeout=timeout, retries=retries
    )
    results = []
    async for err_ind, err_status, _, var_binds in walk_cmd(
        SnmpEngine(),
        CommunityData(community, mpModel=1),
        transport,
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
        lexicographicMode=False,
    ):
        if err_ind or err_status:
            break
        for vb in var_binds:
            results.append((str(vb[0]), vb[1]))
    return results


# ---- Main test runner ----

async def run_tests(ip, community):
    print(f"\n{'='*60}")
    print(f"  SNMP Test — target: {ip}  community: '{community}'")
    print(f"{'='*60}\n")

    passed = 0
    failed = 0

    for name, oid, method, description in TESTS_STANDARD + TESTS_PRINTER:
        print(f"  [{method}] {name}")
        print(f"         OID : {oid}")
        print(f"         Info: {description}")
        try:
            if method == "GET":
                results = await snmp_get(ip, oid, community)
            else:
                results = await snmp_walk(ip, oid, community)

            if results:
                for obj_id, value in results[:3]:  # show max 3 rows per OID
                    print(f"         --> {obj_id} = {value}")
                if len(results) > 3:
                    print(f"         ... ({len(results) - 3} more rows)")
                print(f"         PASS ({len(results)} value(s))\n")
                passed += 1
            else:
                print(f"         WARN: no data returned (OID not supported by device)\n")
                failed += 1

        except Exception as e:
            print(f"         FAIL: {e}\n")
            failed += 1

    print(f"{'='*60}")
    print(f"  Results: {passed} passed, {failed} failed")
    print(f"{'='*60}\n")
    return passed, failed


def main():
    # Resolve target IP, community, and device type from args or auto-detection.
    ip          = sys.argv[1] if len(sys.argv) > 1 else None
    community   = sys.argv[2] if len(sys.argv) > 2 else "public"
    device_type = sys.argv[3] if len(sys.argv) > 3 else "server"

    if not ip:
        ip = get_gateway()
        if ip:
            print(f"[INFO] No IP provided — using auto-detected gateway: {ip}")
        else:
            print("[ERROR] Could not detect gateway. Pass an IP as argument:")
            print("        python snmp_test.py 192.168.1.1")
            sys.exit(1)

    print(f"[INFO] Device type: {device_type}")

    # Run individual OID tests.
    passed, failed = asyncio.run(run_tests(ip, community))

    # Show what collect_snmp_metrics() would actually return to the monitor.
    print("  collect_snmp_metrics() output (what the monitor sends to backend):")
    print(f"  {'-'*56}")
    from snmp_collector import collect_snmp_metrics
    metrics = collect_snmp_metrics(ip, device_type)
    if metrics:
        for m in metrics:
            print(f"  {m}")
    else:
        print("  (empty — device did not respond to any supported OID)")
    print()

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
