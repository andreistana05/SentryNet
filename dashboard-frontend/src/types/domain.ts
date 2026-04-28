export type DeviceStatus = "online" | "offline" | "warning" | "unknown" | string;

export interface Device {
  id: string | number;
  name: string;
  type: string;
  status: DeviceStatus;
  ipAddress: string;
  lastSeen: string | null;
  metrics?: unknown;
  telemetry?: unknown;
}

export interface DashboardOverview {
  devices: {
    total: number;
    online: number;
  };
  alarms: {
    open: number;
  };
  incidents: {
    open: number;
  };
  tickets: {
    open: number;
  };
  problems: {
    open: number;
  };
}

export interface OperationRecord {
  id: string | number;
  title?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Alarm extends OperationRecord {
  source?: string;
  severity?: string;
  incidentId?: string | number | null;
  ticketId?: string | number | null;
}

export interface Incident extends OperationRecord {
  priority?: string;
  owner?: string;
  linkedTicket?: string | number | null;
  nextAction?: string;
}

export interface Ticket extends OperationRecord {
  team?: string;
  assignee?: string;
  incidentId?: string | number | null;
  note?: string;
}

export type TicketStatus =
  | "assigned"
  | "in-progress"
  | "awaiting-vendor"
  | "mitigating"
  | "root-cause-analysis"
  | "resolved"
  | "closed"
  | string;

export interface UpdateTicketStatusPayload {
  status: TicketStatus;
}

export interface TicketNote {
  id: string | number;
  ticketId: string | number;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface CreateTicketNotePayload {
  body: string;
}

export interface Problem extends OperationRecord {
  owner?: string;
  linkedIncident?: string | number | null;
  impact?: string;
}

export type OperationType = "alarms" | "incidents" | "tickets" | "problems";

export interface MetricReading {
  value: unknown;
  unit?: string;
  updatedAt?: string;
}

export interface DeviceMetricsPayload {
  metrics?: unknown;
  telemetry?: unknown;
  data?: unknown;
  [key: string]: unknown;
}

export interface MetricThresholds {
  low: string;
  medium: string;
  high: string;
}

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  accent: "rose" | "amber" | "cyan" | "green";
  aliases: string[];
  thresholds: MetricThresholds;
}

export interface MetricCardViewModel extends MetricDefinition {
  displayValue: string;
  lastUpdated: string;
}

export interface MetricTrendSeries {
  key: string;
  label: string;
  color: string;
  current: number;
  displayValue: string;
  unit: string;
}

export interface MetricTrendPoint {
  time: string;
  timestamp?: number;
  [key: string]: string | number;
}

export interface MetricTrendViewModel {
  points: MetricTrendPoint[];
  series: MetricTrendSeries[];
  hasHistory: boolean;
}

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  filtered: number;
  healthyRatio: number;
  activeAlerts: number;
  openTickets: number;
  openProblems: number;
  openIncidents: number;
}

export interface StatusBreakdownDatum {
  name: string;
  value: number;
  color: string;
}

export interface OperationsWorkloadDatum {
  name: string;
  value: number;
  color: string;
}

export interface AuthSuccess {
  token: string;
  username?: string;
  role?: string;
  user?: {
    username?: string;
    role?: string;
  };
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
