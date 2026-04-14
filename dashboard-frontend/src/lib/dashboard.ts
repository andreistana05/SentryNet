import type { DashboardOverview, DashboardStats, Device, OperationRecord } from "../types/domain";

export function buildDashboardStats(args: {
  overview: DashboardOverview | undefined;
  devices: Device[];
  filteredCount?: number;
  alarms?: OperationRecord[];
  incidents?: OperationRecord[];
  tickets?: OperationRecord[];
  problems?: OperationRecord[];
}): DashboardStats {
  const {
    overview,
    devices,
    filteredCount = devices.length,
    alarms = [],
    incidents = [],
    tickets = [],
    problems = [],
  } = args;

  const totalDevices = overview?.devices.total ?? devices.length;
  const onlineDevices =
    overview?.devices.online ?? devices.filter((device) => device.status === "online").length;
  const healthyRatio = totalDevices ? Math.round((onlineDevices / totalDevices) * 100) : 0;

  return {
    totalDevices,
    onlineDevices,
    filtered: filteredCount,
    healthyRatio,
    activeAlerts: overview?.alarms.open ?? alarms.length,
    openTickets: overview?.tickets.open ?? tickets.length,
    openProblems: overview?.problems.open ?? problems.length,
    openIncidents: overview?.incidents.open ?? incidents.length,
  };
}
