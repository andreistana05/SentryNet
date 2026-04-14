import type {
  DashboardStats,
  Device,
  OperationsWorkloadDatum,
  StatusBreakdownDatum,
} from "../types/domain";

export const chartPalette = {
  cyan: "#67e8f9",
  cyanSoft: "rgba(103, 232, 249, 0.18)",
  rose: "#fb7185",
  amber: "#fbbf24",
  green: "#4ade80",
  muted: "#7487a3",
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

export function formatChartValue(value: number): string {
  return `${value} visible`;
}
