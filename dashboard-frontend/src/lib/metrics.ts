import { chartPalette } from "./charts";
import type { Device, DeviceMetricsPayload, MetricCardViewModel, MetricDefinition, MetricTrendViewModel } from "../types/domain";
import { formatMetricValue, formatTimestamp } from "./formatters";

export const thresholdProfiles: Record<string, MetricDefinition[]> = {
  compute: [
    {
      key: "cpuUsage",
      label: "CPU Usage",
      unit: "%",
      accent: "rose",
      aliases: ["cpu", "cpuusage", "cpu_usage", "cpuutilization", "cpu_utilization", "snmp_cpu", "snmpcpu"],
      thresholds: { low: ">=70% for 10min", medium: ">=85% for 5min", high: ">=95% for 2min" },
    },
    {
      key: "ramUsage",
      label: "RAM Usage",
      unit: "%",
      accent: "amber",
      aliases: ["ram", "memory", "ramusage", "ram_usage", "memoryusage", "memory_usage"],
      thresholds: { low: ">=75% for 10min", medium: ">=88% for 5min", high: ">=95% for 2min" },
    },
    {
      key: "diskUsage",
      label: "Disk Usage",
      unit: "%",
      accent: "cyan",
      aliases: ["disk", "storage", "diskusage", "disk_usage", "storageusage", "storage_usage"],
      thresholds: { low: ">=80% for 30min", medium: ">=90% for 15min", high: ">=97% for 5min" },
    },
    {
      key: "temperature",
      label: "Temperature",
      unit: "C",
      accent: "rose",
      aliases: ["temperature", "temp", "device_temperature", "system_temperature"],
      thresholds: { low: ">=70 C for 15min", medium: ">=80 C for 5min", high: ">=90 C for 1min" },
    },
    {
      key: "latency",
      label: "Latency",
      unit: "ms",
      accent: "green",
      aliases: ["latency", "response_time", "ping", "round_trip_time"],
      thresholds: { low: ">=200ms for 5min", medium: ">=500ms for 3min", high: ">=1000ms for 1min" },
    },
    {
      key: "interfaceUtilization",
      label: "Interface Traffic (in)",
      unit: "GB",
      accent: "cyan",
      aliases: ["snmp_if_in_octets", "snmpifinoctets"],
      thresholds: { low: ">=10 GB for 15min", medium: ">=50 GB for 5min", high: ">=100 GB for 2min" },
    },
  ],
  router: [
    {
      key: "interfaceUtilization",
      label: "Interface Utilization",
      unit: "%",
      accent: "cyan",
      aliases: ["interface", "bandwidth", "throughput", "interfaceutilization", "interface_usage", "snmp_if_in_octets", "snmpifinoctets"],
      thresholds: { low: ">=70% for 15min", medium: ">=85% for 5min", high: ">=95% for 2min" },
    },
    {
      key: "packetLoss",
      label: "Packet Loss",
      unit: "%",
      accent: "green",
      aliases: ["packetloss", "packet_loss", "loss"],
      thresholds: { low: ">=2% for 10min", medium: ">=5% for 5min", high: ">=10% for 2min" },
    },
    {
      key: "latency",
      label: "Latency",
      unit: "ms",
      accent: "green",
      aliases: ["latency", "response_time", "ping", "round_trip_time"],
      thresholds: { low: ">=120ms for 5min", medium: ">=250ms for 3min", high: ">=500ms for 1min" },
    },
  ],
  network: [
    {
      key: "cpuUsage",
      label: "CPU Usage",
      unit: "%",
      accent: "rose",
      aliases: ["cpu", "cpuusage", "cpu_usage", "cpuutilization", "cpu_utilization"],
      thresholds: { low: ">=75% for 10min", medium: ">=88% for 5min", high: ">=95% for 2min" },
    },
    {
      key: "memoryUsage",
      label: "Memory Usage",
      unit: "%",
      accent: "amber",
      aliases: ["memory", "ram", "memoryusage", "memory_usage"],
      thresholds: { low: ">=78% for 10min", medium: ">=90% for 5min", high: ">=96% for 2min" },
    },
    {
      key: "interfaceUtilization",
      label: "Interface Utilization",
      unit: "%",
      accent: "cyan",
      aliases: ["interface", "bandwidth", "throughput", "interfaceutilization", "interface_usage"],
      thresholds: { low: ">=70% for 15min", medium: ">=85% for 5min", high: ">=95% for 2min" },
    },
    {
      key: "temperature",
      label: "Temperature",
      unit: "C",
      accent: "rose",
      aliases: ["temperature", "temp", "chassis_temperature"],
      thresholds: { low: ">=60 C for 15min", medium: ">=75 C for 5min", high: ">=85 C for 1min" },
    },
    {
      key: "packetLoss",
      label: "Packet Loss",
      unit: "%",
      accent: "green",
      aliases: ["packetloss", "packet_loss", "loss"],
      thresholds: { low: ">=2% for 10min", medium: ">=5% for 5min", high: ">=10% for 2min" },
    },
    {
      key: "latency",
      label: "Latency",
      unit: "ms",
      accent: "green",
      aliases: ["latency", "response_time", "ping", "round_trip_time"],
      thresholds: { low: ">=120ms for 5min", medium: ">=250ms for 3min", high: ">=500ms for 1min" },
    },
  ],
  printer: [
    {
      key: "tonerLevel",
      label: "Toner Level",
      unit: "%",
      accent: "amber",
      aliases: ["toner", "tonerlevel", "toner_level", "consumable_level"],
      thresholds: { low: "<=20% for 60min", medium: "<=10% for 30min", high: "<=5% for 10min" },
    },
    {
      key: "drumHealth",
      label: "Drum Health",
      unit: "%",
      accent: "cyan",
      aliases: ["drum", "drumhealth", "drum_health"],
      thresholds: { low: "<=25% for 24h", medium: "<=15% for 12h", high: "<=5% for 4h" },
    },
    {
      key: "paperLevel",
      label: "Paper Level",
      unit: "%",
      accent: "green",
      aliases: ["paper", "paperlevel", "paper_level", "tray_level"],
      thresholds: { low: "<=20% for 60min", medium: "<=10% for 30min", high: "<=5% for 10min" },
    },
    {
      key: "queueDepth",
      label: "Queue Depth",
      unit: "jobs",
      accent: "rose",
      aliases: ["queue", "queuedepth", "queue_depth", "pending_jobs"],
      thresholds: { low: ">=20 jobs for 15min", medium: ">=50 jobs for 10min", high: ">=100 jobs for 5min" },
    },
    {
      key: "responseTime",
      label: "Response Time",
      unit: "ms",
      accent: "green",
      aliases: ["latency", "response_time", "response"],
      thresholds: { low: ">=300ms for 5min", medium: ">=700ms for 3min", high: ">=1500ms for 1min" },
    },
  ],
};

function slugify(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getProfileKey(type?: string | null): string {
  const normalized = String(type || "").toLowerCase();

  if (["server", "workstation", "desktop", "laptop", "vm", "virtual machine"].some((value) => normalized.includes(value))) {
    return "compute";
  }

  if (normalized.includes("router")) {
    return "router";
  }

  if (["router", "switch", "firewall", "access point", "wireless", "network"].some((value) => normalized.includes(value))) {
    return "network";
  }

  if (["printer", "copier", "mfp", "multifunction"].some((value) => normalized.includes(value))) {
    return "printer";
  }

  return "compute";
}

function normalizeMetricDictionary(source: unknown): Record<string, { value: unknown; unit?: string; updatedAt?: string }> {
  if (!source) return {};

  if (Array.isArray(source)) {
    return source.reduce<Record<string, { value: unknown; unit?: string; updatedAt?: string }>>((accumulator, metric) => {
      const rawMetric = metric as Record<string, unknown>;
      const rawKey = rawMetric.key || rawMetric.name || rawMetric.metric || rawMetric.type;
      if (!rawKey) return accumulator;

      accumulator[slugify(rawKey)] = {
        value: rawMetric.value,
        unit: typeof rawMetric.unit === "string" ? rawMetric.unit : undefined,
        updatedAt:
          typeof rawMetric.updatedAt === "string"
            ? rawMetric.updatedAt
            : typeof rawMetric.timestamp === "string"
              ? rawMetric.timestamp
              : undefined,
      };
      return accumulator;
    }, {});
  }

  if (typeof source === "object") {
    return Object.entries(source as Record<string, unknown>).reduce<Record<string, { value: unknown; unit?: string; updatedAt?: string }>>(
      (accumulator, [key, value]) => {
        if (value && typeof value === "object" && "value" in value) {
          const typed = value as { value: unknown; unit?: string; updatedAt?: string; timestamp?: string };
          accumulator[slugify(key)] = {
            value: typed.value,
            unit: typed.unit,
            updatedAt: typed.updatedAt || typed.timestamp,
          };
          return accumulator;
        }

        accumulator[slugify(key)] = { value };
        return accumulator;
      },
      {},
    );
  }

  return {};
}

function getMetricSources(device: Device | null, metricsPayload: DeviceMetricsPayload | null): unknown[] {
  return [
    metricsPayload?.metrics,
    metricsPayload?.telemetry,
    metricsPayload?.data,
    typeof metricsPayload?.data === "object" && metricsPayload?.data ? (metricsPayload.data as Record<string, unknown>).metrics : undefined,
    typeof metricsPayload?.data === "object" && metricsPayload?.data ? (metricsPayload.data as Record<string, unknown>).telemetry : undefined,
    metricsPayload,
    device?.metrics,
    device?.telemetry,
  ];
}

function getHistorySources(device: Device | null, metricsPayload: DeviceMetricsPayload | null): unknown[] {
<<<<<<< HEAD
  const data = typeof metricsPayload?.data === "object" && metricsPayload?.data ? metricsPayload.data as Record<string, unknown> : null;
  const deviceRecord = device as Record<string, unknown> | null;

  return [
=======
  const data = typeof metricsPayload?.data === "object" && metricsPayload?.data && !Array.isArray(metricsPayload.data)
    ? metricsPayload.data as Record<string, unknown>
    : null;
  const deviceRecord = device as Record<string, unknown> | null;

  return [
    // When the backend returns time-series history, it comes back as { data: [...] }
    Array.isArray(metricsPayload?.data) ? metricsPayload.data : undefined,
>>>>>>> 76839a183ddcb290d1364dbf5e19f053b1874839
    metricsPayload?.history,
    metricsPayload?.metricHistory,
    metricsPayload?.metricsHistory,
    metricsPayload?.telemetryHistory,
    data?.history,
    data?.metricHistory,
    data?.metricsHistory,
    data?.telemetryHistory,
    deviceRecord?.history,
    deviceRecord?.metricHistory,
    deviceRecord?.metricsHistory,
    deviceRecord?.telemetryHistory,
  ];
}

function resolveMetric(definition: MetricDefinition, sources: unknown[]) {
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

function coerceNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

<<<<<<< HEAD
=======
function getThresholdValue(definition: MetricDefinition): number | null {
  const highMatch = definition.thresholds.high.match(/-?\d+(\.\d+)?/);
  return highMatch ? coerceNumber(highMatch[0]) : null;
}

>>>>>>> 76839a183ddcb290d1364dbf5e19f053b1874839
function getSeriesColor(accent: MetricDefinition["accent"]): string {
  const colors = {
    rose: chartPalette.rose,
    amber: chartPalette.amber,
    cyan: chartPalette.cyan,
    green: chartPalette.green,
  };

  return colors[accent];
}

function readTimestamp(source: Record<string, unknown>): number | null {
  const rawTimestamp = source.timestamp || source.updatedAt || source.createdAt || source.time || source.ts || source.date;
  if (!rawTimestamp) return null;

  const timestamp = typeof rawTimestamp === "number" ? rawTimestamp : new Date(String(rawTimestamp)).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getRawMetricValue(source: Record<string, unknown>, definition: MetricDefinition): unknown {
  const nestedSources = [
    source.metrics,
    source.telemetry,
    source.values,
    source.readings,
    source.data,
    source,
  ];

  for (const nestedSource of nestedSources) {
    const dictionary = normalizeMetricDictionary(nestedSource);

    for (const alias of definition.aliases) {
      const match = dictionary[slugify(alias)];
      if (match && match.value !== undefined && match.value !== null && match.value !== "") {
        return match.value;
      }
    }
  }

  return null;
}

function appendHistoryPoint(
  pointsByTimestamp: Map<number, Record<string, string | number>>,
  definition: MetricDefinition,
  timestamp: number,
  value: unknown,
) {
  const numeric = coerceNumber(value);
  if (numeric === null) return;

  const point = pointsByTimestamp.get(timestamp) ?? { time: "", timestamp };
  point[definition.key] = numeric;
  pointsByTimestamp.set(timestamp, point);
}

function addArrayHistory(
  source: unknown[],
  definitions: MetricDefinition[],
  pointsByTimestamp: Map<number, Record<string, string | number>>,
) {
  source.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;

    const record = entry as Record<string, unknown>;
    const timestamp = readTimestamp(record);
    if (timestamp === null) return;

    const rawName = record.key || record.name || record.metric || record.type;
    if (rawName && "value" in record) {
      const sluggedName = slugify(rawName);
      const definition = definitions.find((candidate) => candidate.aliases.some((alias) => slugify(alias) === sluggedName));
      if (definition) {
        appendHistoryPoint(pointsByTimestamp, definition, timestamp, record.value);
      }
      return;
    }

    definitions.forEach((definition) => {
      appendHistoryPoint(pointsByTimestamp, definition, timestamp, getRawMetricValue(record, definition));
    });
  });
}

function addObjectHistory(
  source: Record<string, unknown>,
  definitions: MetricDefinition[],
  pointsByTimestamp: Map<number, Record<string, string | number>>,
) {
  Object.entries(source).forEach(([key, value]) => {
    const definition = definitions.find((candidate) => candidate.aliases.some((alias) => slugify(alias) === slugify(key)));
    if (!definition || !Array.isArray(value)) return;

    value.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      const record = entry as Record<string, unknown>;
      const timestamp = readTimestamp(record);
      if (timestamp === null) return;

      appendHistoryPoint(pointsByTimestamp, definition, timestamp, "value" in record ? record.value : record.reading);
    });
  });
}

function buildHistoryPoints(definitions: MetricDefinition[], sources: unknown[]): MetricTrendViewModel["points"] {
  const pointsByTimestamp = new Map<number, Record<string, string | number>>();

  sources.forEach((source) => {
    if (Array.isArray(source)) {
      addArrayHistory(source, definitions, pointsByTimestamp);
      return;
    }

    if (source && typeof source === "object") {
      addObjectHistory(source as Record<string, unknown>, definitions, pointsByTimestamp);
    }
  });

  return Array.from(pointsByTimestamp.entries())
    .sort(([left], [right]) => left - right)
    .map(([timestamp, point]) => ({
      ...point,
      timestamp,
      time: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(timestamp)),
    }));
}

export function buildMetricCards(device: Device | null, metricsPayload: DeviceMetricsPayload | null): MetricCardViewModel[] {
  const activeProfile = thresholdProfiles[getProfileKey(device?.type)] || thresholdProfiles.compute;
  const sources = getMetricSources(device, metricsPayload);

  return activeProfile.map((definition) => {
    const metric = resolveMetric(definition, sources);
    return {
      ...definition,
      displayValue: formatMetricValue(metric.value, metric.unit),
      lastUpdated: formatTimestamp(metric.updatedAt),
    };
  });
}

export function buildMetricTrend(device: Device | null, metricsPayload: DeviceMetricsPayload | null): MetricTrendViewModel {
  const activeProfile = thresholdProfiles[getProfileKey(device?.type)] || thresholdProfiles.compute;
  const sources = getMetricSources(device, metricsPayload);
  const historyPoints = buildHistoryPoints(activeProfile, getHistorySources(device, metricsPayload));
  const reportedKeys = new Set(historyPoints.flatMap((point) => Object.keys(point).filter((key) => key !== "time" && key !== "timestamp")));

  const series = activeProfile.flatMap((definition) => {
    const metric = resolveMetric(definition, sources);
    const current = coerceNumber(metric.value);
    const historyValues = historyPoints.flatMap((point) => typeof point[definition.key] === "number" ? [point[definition.key] as number] : []);
    const latest = historyValues.at(-1) ?? current;

    if (latest === null || (!reportedKeys.has(definition.key) && current === null)) return [];

    return [{
      key: definition.key,
      label: definition.label,
      color: getSeriesColor(definition.accent),
      current: latest,
      displayValue: current === null ? formatMetricValue(latest, metric.unit) : formatMetricValue(metric.value, metric.unit),
      unit: definition.unit,
<<<<<<< HEAD
=======
      thresholdValue: getThresholdValue(definition),
      thresholdLabel: definition.thresholds.high,
>>>>>>> 76839a183ddcb290d1364dbf5e19f053b1874839
    }];
  });

  if (historyPoints.length > 0) {
    return {
      points: historyPoints,
      series,
      hasHistory: true,
    };
  }

  const timeLabels = ["55m", "45m", "35m", "25m", "15m", "Now"];
  const drift = [0.78, 0.86, 0.8, 0.94, 0.89, 1];
  const points = timeLabels.map((time, pointIndex) => {
    const point = { time };

    series.forEach((entry, seriesIndex) => {
      const offset = (seriesIndex % 3) * 2.8;
      point[entry.key] = Number(Math.max(0, entry.current * drift[pointIndex] + offset).toFixed(1));
    });

    return point;
  });

  return { points, series, hasHistory: false };
}
