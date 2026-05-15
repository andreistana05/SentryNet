import type {
  AlarmTrendDatum,
  DashboardStats,
  Device,
  OperationRecord,
  OperationsWorkloadDatum,
  StatusBreakdownDatum,
  GroupWorkloadDatum,
} from "../types/domain";

export const chartPalette = {
  cyan: "#67e8f9",
  cyanSoft: "rgba(103, 232, 249, 0.18)",
  rose: "#fb7185",
  amber: "#fbbf24",
  green: "#4ade80",
  muted: "#7487a3",
  violet: "#a78bfa",
  orange: "#fb923c",
  teal: "#2dd4bf",
  sky: "#38bdf8",
  fuchsia: "#e879f9",
  lime: "#a3e635",
};

export function buildStatusBreakdown(devices: Device[], stats: DashboardStats): StatusBreakdownDatum[] {
  const counts = devices.reduce<Record<string, number>>((accumulator, device) => {
    const key = String(device.status || "unknown").toLowerCase();
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const online = counts.online ?? stats.onlineDevices;
  const offline = counts.offline ?? Math.max(stats.totalDevices - stats.onlineDevices, 0);
  const warning = counts.warning ?? 0;
  const unknown = counts.unknown ?? 0;

  return [
    { name: "Online", value: online, color: chartPalette.green },
    { name: "Offline", value: offline, color: chartPalette.rose },
    { name: "Warning", value: warning, color: chartPalette.amber },
    { name: "Unknown", value: unknown, color: chartPalette.muted },
  ].filter((item) => item.value > 0);
}

export function buildOperationsWorkload(stats: DashboardStats): OperationsWorkloadDatum[] {
  return [
    { name: "Alarms", value: stats.activeAlerts, color: chartPalette.rose },
    { name: "Incidents", value: stats.openIncidents, color: chartPalette.amber },
    { name: "Tickets", value: stats.openTickets, color: chartPalette.cyan },
    { name: "Problems", value: stats.openProblems, color: chartPalette.green },
  ];
}

export function formatChartValue(value: number): [string, string] {
  const safeValue = Number.isFinite(value) ? value : 0;
  const suffix = safeValue === 1 ? "item" : "items";
  return [`${safeValue} ${suffix}`, "Count"];
}

export function buildAlarmPriority(alarms: OperationRecord[]): StatusBreakdownDatum[] {
  const counts = alarms.reduce<Record<string, number>>((acc, alarm) => {
    const key = String(alarm.priority || "unknown").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return [
    { name: "Critical", value: counts.critical ?? 0, color: chartPalette.rose},
    { name: "High", value: counts.high ?? 0, color: chartPalette.amber},
    { name: "Medium", value: counts.medium ?? 0, color: chartPalette.cyan},
    { name: "Low", value: counts.low ?? 0, color: chartPalette.green},
    { name: "Unknown", value: counts.unknown ?? 0, color: chartPalette.muted }
  ].filter((item) => item.value > 0);
}

export function buildAlarmTrend(alarms: OperationRecord[]): AlarmTrendDatum[] {
  const counts = alarms.reduce<Record<string, number>>((acc, alarm) => {
    const raw = alarm.submit_date ?? alarm.created_at ?? "";
    const parsed = new Date(String(raw));
    if (Number.isNaN(parsed.getTime())) return acc;
    const day = parsed.toISOString().slice(0, 10);
    acc[day] = (acc[day] || 0) + 1;
    return acc
  }, {});

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", {month: "short", day: "numeric"}),
      count,
    }));
}

export function buildAlarmTypeBreakdown(items: OperationRecord[]): GroupWorkloadDatum[] {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const desc = String(item.alarm ?? item.description ?? "");
    const match = desc.match(/^(\w+)\s+threshold/i);
    const key = match ? match[1].replace(/_/g, " ") : "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildGroupWorkload(items: OperationRecord[]): GroupWorkloadDatum[] {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.assigned_group || "Unassigned");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
  }, {});
  return Object.entries(counts)
    .map(([group, count]) => ({group, count}))
    .sort((a, b) => b.count - a.count);
}

export function buildIncidentAgeBuckets(items: OperationRecord[]): GroupWorkloadDatum[] {
  const now = Date.now();
  const buckets: Record<string, number> = {"< 1h" : 0, "1-4h": 0, "4-24h": 0, "> 24h": 0 };
  for (const item of items) {
    const status = String(item.status ?? "").toLowerCase();
    if (status === "closed" || status === "resolved") continue;
    
    const raw = String(item.submit_date ?? item.created_at ?? "");
    const parsed = new Date(raw);
    if(Number.isNaN(parsed.getTime())) continue;
    
    const ageHours = (now - parsed.getTime()) / (1000 * 60 * 60);
    if(ageHours < 1) buckets["< 1h"]++;
    else if (ageHours < 4 ) buckets["1-4h"]++;
    else if (ageHours < 24) buckets["4-24h"]++;
    else buckets["> 24h"]++;
    }
    return Object.entries(buckets).map(([group, count]) => ({ group, count}));
}

const FUNNEL_STAGE_ORDER = ["open", "assigned", "in-progress", "investigating", "resolved", "closed"];

export function buildResolutionFunnel(items: OperationRecord[]): GroupWorkloadDatum[] {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.status ?? "unknown").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  const known = FUNNEL_STAGE_ORDER
    .filter((stage) => counts[stage])
    .map((stage) => ({group: stage, count: counts[stage]}));

  const other = Object.entries(counts)
    .filter(([key]) => !FUNNEL_STAGE_ORDER.includes(key))
    .map(([group, count]) => ({group, count}))
    .sort((a, b) => b.count - a.count);
  
    return [...known, ...other];
}