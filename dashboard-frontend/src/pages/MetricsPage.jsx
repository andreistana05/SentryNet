import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

const thresholdProfiles = {
  compute: [
    {
      key: "cpuUsage",
      label: "CPU Usage",
      unit: "%",
      accent: "rose",
      aliases: ["cpu", "cpuusage", "cpu_usage", "cpuutilization", "cpu_utilization"],
      thresholds: {
        low: ">=70% for 10min",
        medium: ">=85% for 5min",
        high: ">=95% for 2min",
      },
    },
    {
      key: "ramUsage",
      label: "RAM Usage",
      unit: "%",
      accent: "amber",
      aliases: ["ram", "memory", "ramusage", "ram_usage", "memoryusage", "memory_usage"],
      thresholds: {
        low: ">=75% for 10min",
        medium: ">=88% for 5min",
        high: ">=95% for 2min",
      },
    },
    {
      key: "diskUsage",
      label: "Disk Usage",
      unit: "%",
      accent: "cyan",
      aliases: ["disk", "storage", "diskusage", "disk_usage", "storageusage", "storage_usage"],
      thresholds: {
        low: ">=80% for 30min",
        medium: ">=90% for 15min",
        high: ">=97% for 5min",
      },
    },
    {
      key: "temperature",
      label: "Temperature",
      unit: "C",
      accent: "rose",
      aliases: ["temperature", "temp", "device_temperature", "system_temperature"],
      thresholds: {
        low: ">=70 C for 15min",
        medium: ">=80 C for 5min",
        high: ">=90 C for 1min",
      },
    },
    {
      key: "latency",
      label: "Latency",
      unit: "ms",
      accent: "green",
      aliases: ["latency", "response_time", "ping", "round_trip_time"],
      thresholds: {
        low: ">=200ms for 5min",
        medium: ">=500ms for 3min",
        high: ">=1000ms for 1min",
      },
    },
  ],
  network: [
    {
      key: "cpuUsage",
      label: "CPU Usage",
      unit: "%",
      accent: "rose",
      aliases: ["cpu", "cpuusage", "cpu_usage", "cpuutilization", "cpu_utilization"],
      thresholds: {
        low: ">=75% for 10min",
        medium: ">=88% for 5min",
        high: ">=95% for 2min",
      },
    },
    {
      key: "memoryUsage",
      label: "Memory Usage",
      unit: "%",
      accent: "amber",
      aliases: ["memory", "ram", "memoryusage", "memory_usage"],
      thresholds: {
        low: ">=78% for 10min",
        medium: ">=90% for 5min",
        high: ">=96% for 2min",
      },
    },
    {
      key: "interfaceUtilization",
      label: "Interface Utilization",
      unit: "%",
      accent: "cyan",
      aliases: ["interface", "bandwidth", "throughput", "interfaceutilization", "interface_usage"],
      thresholds: {
        low: ">=70% for 15min",
        medium: ">=85% for 5min",
        high: ">=95% for 2min",
      },
    },
    {
      key: "temperature",
      label: "Temperature",
      unit: "C",
      accent: "rose",
      aliases: ["temperature", "temp", "chassis_temperature"],
      thresholds: {
        low: ">=60 C for 15min",
        medium: ">=75 C for 5min",
        high: ">=85 C for 1min",
      },
    },
    {
      key: "packetLoss",
      label: "Packet Loss",
      unit: "%",
      accent: "green",
      aliases: ["packetloss", "packet_loss", "loss"],
      thresholds: {
        low: ">=2% for 10min",
        medium: ">=5% for 5min",
        high: ">=10% for 2min",
      },
    },
    {
      key: "latency",
      label: "Latency",
      unit: "ms",
      accent: "green",
      aliases: ["latency", "response_time", "ping", "round_trip_time"],
      thresholds: {
        low: ">=120ms for 5min",
        medium: ">=250ms for 3min",
        high: ">=500ms for 1min",
      },
    },
  ],
  printer: [
    {
      key: "tonerLevel",
      label: "Toner Level",
      unit: "%",
      accent: "amber",
      aliases: ["toner", "tonerlevel", "toner_level", "consumable_level"],
      thresholds: {
        low: "<=20% for 60min",
        medium: "<=10% for 30min",
        high: "<=5% for 10min",
      },
    },
    {
      key: "drumHealth",
      label: "Drum Health",
      unit: "%",
      accent: "cyan",
      aliases: ["drum", "drumhealth", "drum_health"],
      thresholds: {
        low: "<=25% for 24h",
        medium: "<=15% for 12h",
        high: "<=5% for 4h",
      },
    },
    {
      key: "paperLevel",
      label: "Paper Level",
      unit: "%",
      accent: "green",
      aliases: ["paper", "paperlevel", "paper_level", "tray_level"],
      thresholds: {
        low: "<=20% for 60min",
        medium: "<=10% for 30min",
        high: "<=5% for 10min",
      },
    },
    {
      key: "queueDepth",
      label: "Queue Depth",
      unit: "jobs",
      accent: "rose",
      aliases: ["queue", "queuedepth", "queue_depth", "pending_jobs"],
      thresholds: {
        low: ">=20 jobs for 15min",
        medium: ">=50 jobs for 10min",
        high: ">=100 jobs for 5min",
      },
    },
    {
      key: "responseTime",
      label: "Response Time",
      unit: "ms",
      accent: "green",
      aliases: ["latency", "response_time", "response"],
      thresholds: {
        low: ">=300ms for 5min",
        medium: ">=700ms for 3min",
        high: ">=1500ms for 1min",
      },
    },
  ],
};

function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getProfileKey(type) {
  const normalized = String(type || "").toLowerCase();

  if (
    ["server", "workstation", "desktop", "laptop", "vm", "virtual machine"].some((value) =>
      normalized.includes(value),
    )
  ) {
    return "compute";
  }

  if (
    ["router", "switch", "firewall", "access point", "wireless", "network"].some((value) =>
      normalized.includes(value),
    )
  ) {
    return "network";
  }

  if (["printer", "copier", "mfp", "multifunction"].some((value) => normalized.includes(value))) {
    return "printer";
  }

  return "compute";
}

function normalizeMetricDictionary(source) {
  if (!source) return {};

  if (Array.isArray(source)) {
    return source.reduce((accumulator, metric) => {
      const rawKey = metric?.key || metric?.name || metric?.metric;
      if (!rawKey) return accumulator;

      accumulator[slugify(rawKey)] = {
        value: metric?.value,
        unit: metric?.unit,
        updatedAt: metric?.updatedAt || metric?.timestamp,
      };
      return accumulator;
    }, {});
  }

  if (typeof source === "object") {
    return Object.entries(source).reduce((accumulator, [key, value]) => {
      accumulator[slugify(key)] =
        value && typeof value === "object" && "value" in value
          ? {
              value: value.value,
              unit: value.unit,
              updatedAt: value.updatedAt || value.timestamp,
            }
          : { value, unit: undefined, updatedAt: undefined };
      return accumulator;
    }, {});
  }

  return {};
}

function getMetricSources(device, metricsPayload) {
  return [
    metricsPayload?.metrics,
    metricsPayload?.telemetry,
    metricsPayload?.data?.metrics,
    metricsPayload?.data?.telemetry,
    metricsPayload,
    device?.metrics,
    device?.telemetry,
  ];
}

function formatMetricValue(value, unit) {
  if (value === null || value === undefined || value === "") {
    return "Not reporting";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    if (!unit) return formatted;
    return unit === "C" ? `${formatted} deg C` : `${formatted}${unit === "%" ? "%" : ` ${unit}`}`;
  }

  return String(value);
}

function resolveMetric(definition, sources) {
  for (const source of sources) {
    const dictionary = normalizeMetricDictionary(source);

    for (const alias of definition.aliases) {
      const match = dictionary[slugify(alias)];
      if (match && match.value !== undefined && match.value !== null && match.value !== "") {
        return {
          value: match.value,
          unit: match.unit || definition.unit,
          updatedAt: match.updatedAt,
        };
      }
    }
  }

  return {
    value: null,
    unit: definition.unit,
    updatedAt: null,
  };
}

function formatTimestamp(value) {
  if (!value) return "Awaiting telemetry";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Awaiting telemetry";
  }
}

function MetricsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState(null);
  const [devices, setDevices] = useState([]);
  const [metricsPayload, setMetricsPayload] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setPageError("");

      const [statusResponse, devicesResponse] = await Promise.allSettled([
        API.get("/status"),
        API.get("/devices"),
      ]);

      if (!isMounted) return;

      if (statusResponse.status === "fulfilled") {
        setOverview(statusResponse.value.data);
      }

      if (devicesResponse.status === "fulfilled") {
        setDevices(normalizeCollection(devicesResponse.value.data));
      } else {
        setPageError("We couldn't load devices for the metrics view.");
      }

      setIsLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedDeviceId = searchParams.get("device");

  useEffect(() => {
    if (!devices.length) return;

    const matched = devices.some((device) => String(device.id) === String(selectedDeviceId));
    if (matched) return;

    setSearchParams({ device: String(devices[0].id) }, { replace: true });
  }, [devices, selectedDeviceId, setSearchParams]);

  const selectedDevice = useMemo(() => {
    return devices.find((device) => String(device.id) === String(selectedDeviceId)) ?? null;
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      if (!selectedDevice?.id) {
        setMetricsPayload(null);
        return;
      }

      setIsLoadingMetrics(true);

      try {
        const response = await API.get(`/devices/${selectedDevice.id}/metrics`);
        if (isMounted) {
          setMetricsPayload(response.data);
        }
      } catch {
        if (isMounted) {
          setMetricsPayload(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingMetrics(false);
        }
      }
    }

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, [selectedDevice?.id]);

  const stats = useMemo(() => {
    return {
      totalDevices: overview?.devices?.total ?? devices.length,
      onlineDevices:
        overview?.devices?.online ?? devices.filter((device) => device.status === "online").length,
      activeAlerts: overview?.alarms?.open ?? 0,
      openTickets: overview?.tickets?.open ?? 0,
      openProblems: overview?.problems?.open ?? 0,
    };
  }, [devices, overview]);

  const activeProfile = useMemo(() => {
    return thresholdProfiles[getProfileKey(selectedDevice?.type)];
  }, [selectedDevice?.type]);

  const metricCards = useMemo(() => {
    const sources = getMetricSources(selectedDevice, metricsPayload);

    return activeProfile.map((definition) => {
      const metric = resolveMetric(definition, sources);

      return {
        ...definition,
        displayValue: formatMetricValue(metric.value, metric.unit),
        lastUpdated: formatTimestamp(metric.updatedAt),
      };
    });
  }, [activeProfile, metricsPayload, selectedDevice]);

  const supportedProfiles = useMemo(() => {
    return Array.from(new Set(devices.map((device) => getProfileKey(device.type))));
  }, [devices]);

  return (
    <AppShell stats={stats}>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Device Metrics</span>
          <h2>Thresholds and live telemetry tailored to the device you are inspecting.</h2>
          <p>
            Servers and workstations keep compute-focused signals, network gear shifts toward
            transport health, and printers expose consumables instead of irrelevant system metrics.
          </p>
          {pageError ? <div className="table-state error-state">{pageError}</div> : null}
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <span>Selected Asset</span>
            <strong>{selectedDevice?.name ?? (isLoading ? "--" : "No device")}</strong>
            <p>
              {selectedDevice
                ? `${selectedDevice.type || "Unknown"} telemetry profile`
                : "Pick a device to inspect its available metrics."}
            </p>
          </div>
          <div className="hero-stat-card">
            <span>Profiles In Fleet</span>
            <strong>{supportedProfiles.length}</strong>
            <p>Telemetry templates currently represented by your monitored inventory.</p>
          </div>
        </div>
      </section>

      <section className="control-surface metrics-control-surface">
        <div className="control-copy">
          <span className="eyebrow">Telemetry Scope</span>
          <h3>Choose a device and review only the metrics that make sense for its role.</h3>
          <p>
            If the backend provides live readings, they appear here. Otherwise the page still
            shows the expected thresholds for that device class.
          </p>
        </div>

        <div className="filters-bar metrics-filters">
          <label className="filter-group">
            <span>Device</span>
            <select
              value={selectedDevice?.id ?? ""}
              onChange={(event) => setSearchParams({ device: event.target.value })}
              disabled={!devices.length}
            >
              {devices.length ? null : <option value="">No devices available</option>}
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.type || "Unknown"})
                </option>
              ))}
            </select>
          </label>

          <div className="metrics-context-card">
            <span className="metrics-context-label">Device Status</span>
            <strong>{selectedDevice?.status ?? "Unknown"}</strong>
            <p>{selectedDevice?.ip_address ?? "IP address unavailable"}</p>
          </div>

          <div className="metrics-context-card">
            <span className="metrics-context-label">Telemetry Source</span>
            <strong>{isLoadingMetrics ? "Loading" : metricsPayload ? "Live API" : "Profile only"}</strong>
            <p>
              {isLoadingMetrics
                ? "Fetching latest device metrics."
                : "Thresholds remain visible even when the device is not reporting."}
            </p>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {metricCards.map((metric, index) => (
          <article
            key={metric.key}
            className={`metric-card accent-${metric.accent} ${isLoading ? "is-loading" : ""}`}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="metric-card-top">
              <span>{metric.label}</span>
              <div className="metric-orb" />
            </div>

            <strong>{isLoading ? "--" : metric.displayValue}</strong>
            <p>High threshold: {metric.thresholds.high}</p>
            <span className="metric-footnote">Last update: {metric.lastUpdated}</span>
          </article>
        ))}
      </section>

      <section className="table-container">
        <div className="table-header">
          <div>
            <span className="eyebrow">Threshold Matrix</span>
            <h3>Alert levels for {selectedDevice?.type ?? "the selected profile"}</h3>
          </div>
        </div>

        {!selectedDevice && !isLoading ? (
          <div className="table-state empty-state">
            No device is available yet. Once inventory loads, this page will attach the correct
            metric profile automatically.
          </div>
        ) : null}

        {selectedDevice ? (
          <div className="table-scroll">
            <table className="devices-table metrics-threshold-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Low</th>
                  <th>Medium</th>
                  <th>High</th>
                </tr>
              </thead>
              <tbody>
                {activeProfile.map((metric) => (
                  <tr key={metric.key}>
                    <td>
                      <div className="device-name-cell">
                        <strong>{metric.label}</strong>
                        <span>{metric.unit === "C" ? "Unit: deg C" : `Unit: ${metric.unit}`}</span>
                      </div>
                    </td>
                    <td>{metric.thresholds.low}</td>
                    <td>{metric.thresholds.medium}</td>
                    <td>{metric.thresholds.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

export default MetricsPage;
