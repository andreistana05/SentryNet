import type { Device, DeviceMetricsPayload, MetricCardViewModel, MetricDefinition } from "../types/domain";
import { formatMetricValue, formatTimestamp } from "./formatters";

export const thresholdProfiles: Record<string, MetricDefinition[]> = {
  compute: [
    {
      key: "cpuUsage",
      label: "CPU Usage",
      unit: "%",
      accent: "rose",
      aliases: ["cpu", "cpuusage", "cpu_usage", "cpuutilization", "cpu_utilization"],
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
