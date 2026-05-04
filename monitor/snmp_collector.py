"""
SentryNet SNMP Collector – Module 4 (sub-component).

Polls standard SNMP OIDs from network devices and returns metric dicts
that the monitor can forward directly to the SentryNet backend ingest API.

Collected metrics per device:
  - System uptime     (MIB-II sysUpTime)
  - CPU load average  (HOST-RESOURCES-MIB hrProcessorLoad)
  - Interface traffic (MIB-II ifInOctets / ifOutOctets)

If SNMP is disabled or pysnmp is not installed, collect_snmp_metrics()
returns an empty list so the rest of the monitor continues unaffected.
"""
import os
import asyncio

# ---- Configuration ----

SNMP_COMMUNITY = os.getenv("SNMP_COMMUNITY", "public")
SNMP_PORT      = int(os.getenv("SNMP_PORT", "161"))
SNMP_TIMEOUT   = int(os.getenv("SNMP_TIMEOUT", "2"))    # seconds per request
SNMP_RETRIES   = int(os.getenv("SNMP_RETRIES", "1"))    # retries before giving up
SNMP_ENABLED   = os.getenv("SNMP_ENABLED", "true").lower() == "true"

# ---- OID definitions ----

# Standard OIDs — MIB-II (RFC 1213) and HOST-RESOURCES-MIB
OID_SYS_UPTIME    = "1.3.6.1.2.1.1.3.0"
OID_CPU_LOAD      = "1.3.6.1.2.1.25.3.3.1.2"  # hrProcessorLoad table
OID_IF_IN_OCTETS  = "1.3.6.1.2.1.2.2.1.10"    # ifInOctets table
OID_IF_OUT_OCTETS = "1.3.6.1.2.1.2.2.1.16"    # ifOutOctets table

# Printer MIB OIDs — RFC 3805 (Printer MIB v2)
OID_TONER_LEVEL    = "1.3.6.1.2.1.43.11.1.1.9.1.1"  # prtMarkerSuppliesLevel
OID_TONER_MAX      = "1.3.6.1.2.1.43.11.1.1.8.1.1"  # prtMarkerSuppliesMaxCapacity
OID_PAPER_LEVEL    = "1.3.6.1.2.1.43.8.2.1.10.1.1"  # prtInputCurrentLevel
OID_PAPER_MAX      = "1.3.6.1.2.1.43.8.2.1.9.1.1"   # prtInputMaxCapacity
OID_DRUM_STATUS    = "1.3.6.1.2.1.43.11.1.1.9.1.2"  # prtMarkerSuppliesLevel (drum cartridge)

# ---- Library import (optional dependency) ----

# pysnmp is an optional dependency — the monitor runs without it.
# Install with: pip install pysnmp
try:
    from pysnmp.hlapi.v3arch.asyncio import (
        get_cmd, walk_cmd, SnmpEngine, CommunityData,
        UdpTransportTarget, ContextData, ObjectType, ObjectIdentity,
    )
    _SNMP_AVAILABLE = True
except ImportError as e:
    _SNMP_AVAILABLE = False
    print(f"[SNMP] pysnmp not available: {e}. Run: pip install pysnmp")

# ---- SNMP primitives ----

async def _get(ip, oid):
    """Single SNMP GET. Returns the raw value or None on any error."""
    transport = await UdpTransportTarget.create(
        (ip, SNMP_PORT), timeout=SNMP_TIMEOUT, retries=SNMP_RETRIES
    )
    err_ind, err_status, _, var_binds = await get_cmd(
        SnmpEngine(),
        CommunityData(SNMP_COMMUNITY, mpModel=1),  # SNMPv2c
        transport,
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
    )
    if err_ind or err_status:
        return None
    for vb in var_binds:
        return vb[1]
    return None


async def _walk(ip, oid):
    """SNMP WALK over a table OID. Returns a list of integer values."""
    transport = await UdpTransportTarget.create(
        (ip, SNMP_PORT), timeout=SNMP_TIMEOUT, retries=SNMP_RETRIES
    )
    results = []
    async for err_ind, err_status, _, var_binds in walk_cmd(
        SnmpEngine(),
        CommunityData(SNMP_COMMUNITY, mpModel=1),
        transport,
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
        lexicographicMode=False,
    ):
        if err_ind or err_status:
            break
        for vb in var_binds:
            try:
                results.append(int(vb[1]))
            except Exception:
                pass
    return results

# ---- Metric collection ----

async def _collect_async(ip, device_type="server"):
    """Gather all SNMP metrics for a single device asynchronously."""
    metrics = []

    # Uptime is reported in hundredths of a second by MIB-II — convert to seconds.
    uptime = await _get(ip, OID_SYS_UPTIME)
    if uptime is not None:
        metrics.append({"type": "snmp_uptime", "value": round(int(uptime) / 100.0, 1), "unit": "s"})

    if device_type == "printer":
        # Toner level: expressed as % of max capacity.
        toner_cur = await _get(ip, OID_TONER_LEVEL)
        toner_max = await _get(ip, OID_TONER_MAX)
        if toner_cur is not None and toner_max is not None:
            max_val = int(toner_max)
            if max_val > 0:
                metrics.append({
                    "type": "toner_level",
                    "value": round(int(toner_cur) / max_val * 100, 1),
                    "unit": "%",
                })

        # Drum status: expressed as % of max capacity.
        drum_cur = await _get(ip, OID_DRUM_STATUS)
        if drum_cur is not None and toner_max is not None:
            max_val = int(toner_max)
            if max_val > 0:
                metrics.append({
                    "type": "drum_health",
                    "value": round(int(drum_cur) / max_val * 100, 1),
                    "unit": "%",
                })

        # Paper level: expressed as % of tray capacity.
        paper_cur = await _get(ip, OID_PAPER_LEVEL)
        paper_max = await _get(ip, OID_PAPER_MAX)
        if paper_cur is not None and paper_max is not None:
            max_val = int(paper_max)
            if max_val > 0:
                metrics.append({
                    "type": "paper_level",
                    "value": round(int(paper_cur) / max_val * 100, 1),
                    "unit": "%",
                })
    else:
        # CPU load: average across all processor entries in the hrProcessorLoad table.
        cpu_values = await _walk(ip, OID_CPU_LOAD)
        if cpu_values:
            metrics.append({
                "type": "snmp_cpu",
                "value": round(sum(cpu_values) / len(cpu_values), 2),
                "unit": "%",
            })

        # Interface traffic: sum octets across all interfaces, converted to GB for readability.
        in_octets = await _walk(ip, OID_IF_IN_OCTETS)
        if in_octets:
            metrics.append({"type": "snmp_if_in_octets", "value": round(sum(in_octets) / (1024 ** 3), 2), "unit": "GB"})

        out_octets = await _walk(ip, OID_IF_OUT_OCTETS)
        if out_octets:
            metrics.append({"type": "snmp_if_out_octets", "value": round(sum(out_octets) / (1024 ** 3), 2), "unit": "GB"})

    return metrics


def collect_snmp_metrics(ip, device_type="server"):
    """Query standard SNMP OIDs from a network device.

    Returns a list of metric dicts ready for the backend ingest API.
    Returns [] if SNMP is disabled, unavailable, or the device doesn't respond.
    Collects printer-specific OIDs (toner, drum, paper) when device_type is 'printer'.
    """
    if not SNMP_ENABLED or not _SNMP_AVAILABLE:
        return []

    try:
        metrics = asyncio.run(_collect_async(ip, device_type))
    except Exception as e:
        print(f"[SNMP] Error querying {ip}: {e}")
        return []

    if metrics:
        print(f"[SNMP] {ip}: collected {len(metrics)} metric(s)")
    else:
        print(f"[SNMP] {ip}: no response (community='{SNMP_COMMUNITY}', port={SNMP_PORT})")

    return metrics
