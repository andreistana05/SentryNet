import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "../services/api";

const now = new Date("2026-06-23T15:30:00.000Z");

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

function hoursAgo(hours: number) {
  return new Date(now.getTime() - hours * 60 * 60_000).toISOString();
}

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60_000).toISOString();
}

const groups = [
  { id: "grp-noc", name: "Network Operations", description: "Monitors routing, switching, WAN links, and device availability." },
  { id: "grp-it", name: "IT Support", description: "Handles servers, workstations, operating systems, and user-impacting incidents." },
  { id: "grp-dba", name: "Database Team", description: "Owns database health, storage capacity, and query performance." },
  { id: "grp-fac", name: "Facilities", description: "Supports printers, office equipment, and local hardware requests." },
  { id: "grp-sec", name: "Security Response", description: "Investigates suspicious events and access-control escalations." },
];

const employees = [
  { id: "emp-1", name: "Alex Ionescu", email: "alex.ionescu@sentrynet.local", role: "Admin", group_id: "grp-it", group: groups[1] },
  { id: "emp-2", name: "Maria Popescu", email: "maria.popescu@sentrynet.local", role: "Operator", group_id: "grp-dba", group: groups[2] },
  { id: "emp-3", name: "Ion Georgescu", email: "ion.georgescu@sentrynet.local", role: "Operator", group_id: "grp-noc", group: groups[0] },
  { id: "emp-4", name: "Elena Radu", email: "elena.radu@sentrynet.local", role: "Operator", group_id: "grp-sec", group: groups[4] },
  { id: "emp-5", name: "Andrei Pavel", email: "andrei.pavel@sentrynet.local", role: "Viewer", group_id: "grp-fac", group: groups[3] },
  { id: "emp-6", name: "Bianca Stan", email: "bianca.stan@sentrynet.local", role: "Operator", group_id: "grp-noc", group: groups[0] },
];

const devices = [
  {
    id: "dev-core-router",
    name: "Core Router 01",
    type: "Router",
    status: "online",
    ip_address: "10.0.0.1",
    last_seen: minutesAgo(1),
    metrics: [
      { type: "latency", value: 18, unit: "ms", timestamp: minutesAgo(1) },
      { type: "packet_loss", value: 0.2, unit: "%", timestamp: minutesAgo(1) },
      { type: "interface_utilization", value: 64, unit: "%", timestamp: minutesAgo(1) },
    ],
  },
  {
    id: "dev-dist-switch",
    name: "Distribution Switch 01",
    type: "Switch",
    status: "warning",
    ip_address: "10.0.0.2",
    last_seen: minutesAgo(2),
    metrics: [
      { type: "cpu_usage", value: 76, unit: "%", timestamp: minutesAgo(2) },
      { type: "memory_usage", value: 71, unit: "%", timestamp: minutesAgo(2) },
      { type: "interface_utilization", value: 88, unit: "%", timestamp: minutesAgo(2) },
      { type: "temperature", value: 67, unit: "C", timestamp: minutesAgo(2) },
    ],
  },
  {
    id: "dev-app-01",
    name: "App Server 01",
    type: "Server",
    status: "warning",
    ip_address: "10.0.1.10",
    last_seen: minutesAgo(1),
    metrics: [
      { type: "cpu_usage", value: 87, unit: "%", timestamp: minutesAgo(1) },
      { type: "ram_usage", value: 91, unit: "%", timestamp: minutesAgo(1) },
      { type: "disk_usage", value: 74, unit: "%", timestamp: minutesAgo(1) },
      { type: "temperature", value: 78, unit: "C", timestamp: minutesAgo(1) },
      { type: "latency", value: 240, unit: "ms", timestamp: minutesAgo(1) },
      { type: "snmp_if_in_octets", value: 42.7, unit: "GB", timestamp: minutesAgo(1) },
    ],
  },
  {
    id: "dev-db-01",
    name: "DB Server 01",
    type: "Server",
    status: "warning",
    ip_address: "10.0.1.11",
    last_seen: minutesAgo(4),
    metrics: [
      { type: "cpu_usage", value: 55, unit: "%", timestamp: minutesAgo(4) },
      { type: "ram_usage", value: 82, unit: "%", timestamp: minutesAgo(4) },
      { type: "disk_usage", value: 89.5, unit: "%", timestamp: minutesAgo(4) },
      { type: "temperature", value: 65, unit: "C", timestamp: minutesAgo(4) },
      { type: "snmp_if_in_octets", value: 68.4, unit: "GB", timestamp: minutesAgo(4) },
    ],
  },
  {
    id: "dev-backup",
    name: "Backup Server",
    type: "Server",
    status: "offline",
    ip_address: "10.0.1.12",
    last_seen: hoursAgo(2),
    metrics: [
      { type: "availability", value: 0, unit: "bool", timestamp: hoursAgo(2) },
      { type: "latency", value: 0, unit: "ms", timestamp: hoursAgo(2) },
    ],
  },
  {
    id: "dev-printer",
    name: "Office Printer",
    type: "Printer",
    status: "warning",
    ip_address: "10.0.3.50",
    last_seen: minutesAgo(10),
    metrics: [
      { type: "toner_level", value: 15, unit: "%", timestamp: minutesAgo(10) },
      { type: "drum_health", value: 22, unit: "%", timestamp: minutesAgo(10) },
      { type: "paper_level", value: 40, unit: "%", timestamp: minutesAgo(10) },
      { type: "queue_depth", value: 8, unit: "jobs", timestamp: minutesAgo(10) },
      { type: "latency", value: 190, unit: "ms", timestamp: minutesAgo(10) },
    ],
  },
  {
    id: "dev-dev-ws-01",
    name: "Dev Workstation 01",
    type: "Workstation",
    status: "online",
    ip_address: "10.0.2.20",
    last_seen: minutesAgo(3),
    metrics: [
      { type: "cpu_usage", value: 34, unit: "%", timestamp: minutesAgo(3) },
      { type: "ram_usage", value: 58, unit: "%", timestamp: minutesAgo(3) },
      { type: "disk_usage", value: 62, unit: "%", timestamp: minutesAgo(3) },
      { type: "temperature", value: 46, unit: "C", timestamp: minutesAgo(3) },
      { type: "latency", value: 21, unit: "ms", timestamp: minutesAgo(3) },
      { type: "snmp_if_in_octets", value: 18.6, unit: "GB", timestamp: minutesAgo(3) },
    ],
  },
  {
    id: "dev-firewall",
    name: "Perimeter Firewall",
    type: "Firewall",
    status: "online",
    ip_address: "10.0.0.254",
    last_seen: minutesAgo(1),
    metrics: [
      { type: "cpu_usage", value: 49, unit: "%", timestamp: minutesAgo(1) },
      { type: "memory_usage", value: 63, unit: "%", timestamp: minutesAgo(1) },
      { type: "packet_loss", value: 0.1, unit: "%", timestamp: minutesAgo(1) },
      { type: "latency", value: 12, unit: "ms", timestamp: minutesAgo(1) },
    ],
  },
];

const alarms = [
  {
    id: "alm-001",
    alarm_number: "ALM0001",
    alarm: "CPU threshold exceeded - App Server 01 at 87% for 8+ minutes",
    priority: "High",
    status: "Open",
    assigned_group: "IT Support",
    assigned_person: "Alex Ionescu",
    submit_date: minutesAgo(15),
  },
  {
    id: "alm-002",
    alarm_number: "ALM0002",
    alarm: "RAM threshold exceeded - App Server 01 at 91%",
    priority: "High",
    status: "In Progress",
    assigned_group: "IT Support",
    assigned_person: "Alex Ionescu",
    submit_date: minutesAgo(10),
  },
  {
    id: "alm-003",
    alarm_number: "ALM0003",
    alarm: "Disk threshold exceeded - DB Server 01 at 89.5%",
    priority: "High",
    status: "Open",
    assigned_group: "Database Team",
    assigned_person: "Maria Popescu",
    submit_date: minutesAgo(30),
  },
  {
    id: "alm-004",
    alarm_number: "ALM0004",
    alarm: "Interface threshold exceeded - Distribution Switch 01 uplink saturation",
    priority: "Medium",
    status: "Open",
    assigned_group: "Network Operations",
    assigned_person: "Bianca Stan",
    submit_date: hoursAgo(1.3),
  },
  {
    id: "alm-005",
    alarm_number: "ALM0005",
    alarm: "Backup Server offline - heartbeat timeout",
    priority: "High",
    status: "In Progress",
    assigned_group: "IT Support",
    assigned_person: "Ion Georgescu",
    submit_date: hoursAgo(2),
  },
  {
    id: "alm-006",
    alarm_number: "ALM0006",
    alarm: "Toner level low - Office Printer at 15%",
    priority: "Low",
    status: "Open",
    assigned_group: "Facilities",
    assigned_person: "Andrei Pavel",
    submit_date: minutesAgo(45),
  },
  {
    id: "alm-007",
    alarm_number: "ALM0007",
    alarm: "Latency threshold exceeded - App Server 01 response time 240ms",
    priority: "Medium",
    status: "Open",
    assigned_group: "Network Operations",
    assigned_person: "Ion Georgescu",
    submit_date: minutesAgo(8),
  },
  {
    id: "alm-008",
    alarm_number: "ALM0008",
    alarm: "Suspicious login burst - Perimeter Firewall detected repeated failures",
    priority: "Critical",
    status: "Open",
    assigned_group: "Security Response",
    assigned_person: "Elena Radu",
    submit_date: minutesAgo(6),
  },
];

const incidents = [
  {
    id: "inc-001",
    incident_number: "INC0001",
    description: "Application tier degradation caused by CPU and memory pressure on App Server 01.",
    priority: "High",
    status: "Investigating",
    assigned_group: "IT Support",
    assigned_person: "Alex Ionescu",
    submit_date: minutesAgo(14),
  },
  {
    id: "inc-002",
    incident_number: "INC0002",
    description: "Database storage capacity approaching threshold on DB Server 01.",
    priority: "High",
    status: "Assigned",
    assigned_group: "Database Team",
    assigned_person: "Maria Popescu",
    submit_date: minutesAgo(29),
  },
  {
    id: "inc-003",
    incident_number: "INC0003",
    description: "Backup Server has been offline for over 2 hours; backup SLA is at risk.",
    priority: "High",
    status: "In Progress",
    assigned_group: "IT Support",
    assigned_person: "Ion Georgescu",
    submit_date: hoursAgo(2),
  },
  {
    id: "inc-004",
    incident_number: "INC0004",
    description: "Repeated authentication failures detected at the perimeter firewall.",
    priority: "Critical",
    status: "Open",
    assigned_group: "Security Response",
    assigned_person: "Elena Radu",
    submit_date: minutesAgo(5),
  },
];

const tickets = [
  {
    id: "tkt-001",
    ticket_number: "TKT0001",
    title: "Investigate CPU and RAM spike on App Server 01",
    status: "in-progress",
    priority: "High",
    assigned_group: "IT Support",
    assigned_person: "Alex Ionescu",
    submit_date: minutesAgo(14),
  },
  {
    id: "tkt-002",
    ticket_number: "TKT0002",
    title: "Expand database storage capacity",
    status: "assigned",
    priority: "High",
    assigned_group: "Database Team",
    assigned_person: "Maria Popescu",
    submit_date: minutesAgo(28),
  },
  {
    id: "tkt-003",
    ticket_number: "TKT0003",
    title: "Restore and verify Backup Server",
    status: "awaiting-vendor",
    priority: "High",
    assigned_group: "IT Support",
    assigned_person: "Ion Georgescu",
    submit_date: hoursAgo(1.9),
  },
  {
    id: "tkt-004",
    ticket_number: "TKT0004",
    title: "Review suspicious login burst on firewall",
    status: "mitigating",
    priority: "Critical",
    assigned_group: "Security Response",
    assigned_person: "Elena Radu",
    submit_date: minutesAgo(4),
  },
  {
    id: "tkt-005",
    ticket_number: "TKT0005",
    title: "Replace printer toner and check queue backlog",
    status: "assigned",
    priority: "Low",
    assigned_group: "Facilities",
    assigned_person: "Andrei Pavel",
    submit_date: minutesAgo(40),
  },
];

const problems = [
  {
    id: "prb-001",
    problem_number: "PRB0001",
    alarm_name: "CPU threshold exceeded - App Server 01",
    description: "Recurring CPU spikes during business hours. Root cause analysis points to a cache regression in the web service.",
    status: "root-cause-analysis",
    priority: "High",
    assigned_group: "IT Support",
    assigned_person: "Alex Ionescu",
    occurrence_count: 4,
    submit_date: daysAgo(3),
  },
  {
    id: "prb-002",
    problem_number: "PRB0002",
    alarm_name: "Backup Server offline",
    description: "Backup Server has failed twice in 30 days due to hardware instability. Replacement plan is under review.",
    status: "Open",
    priority: "Medium",
    assigned_group: "IT Support",
    assigned_person: "Maria Popescu",
    occurrence_count: 2,
    submit_date: daysAgo(15),
  },
];

const ticketNotes: Record<string, Array<{ id: string; ticketId: string; body: string; authorName: string; createdAt: string }>> = {
  "tkt-001": [
    { id: "note-1", ticketId: "tkt-001", body: "Heap dump captured. Request cache is retaining far more entries than expected.", authorName: "Alex Ionescu", createdAt: minutesAgo(11) },
    { id: "note-2", ticketId: "tkt-001", body: "Rollback window approved. Watching CPU and RAM for the next 30 minutes.", authorName: "Network Admin", createdAt: minutesAgo(3) },
  ],
  "tkt-002": [
    { id: "note-3", ticketId: "tkt-002", body: "Old WAL archive cleanup started. Storage expansion request submitted.", authorName: "Maria Popescu", createdAt: minutesAgo(18) },
  ],
  "tkt-003": [
    { id: "note-4", ticketId: "tkt-003", body: "Vendor confirmed PSU replacement ETA of 4 hours.", authorName: "Ion Georgescu", createdAt: minutesAgo(22) },
  ],
  "tkt-004": [
    { id: "note-5", ticketId: "tkt-004", body: "Temporary block rule applied for source network. Validating whether attempts are automated.", authorName: "Elena Radu", createdAt: minutesAgo(2) },
  ],
};

function metricHistory(deviceId: string) {
  const device = devices.find((entry) => entry.id === deviceId) ?? devices[0];
  const baseMetrics = device.metrics as Array<{ type: string; value: number; unit: string }>;
  const multipliers = [0.76, 0.81, 0.88, 0.84, 0.93, 1];
  const history = multipliers.flatMap((multiplier, index) => {
    const timestamp = minutesAgo((multipliers.length - index - 1) * 12);
    return baseMetrics.map((metric, metricIndex) => ({
      type: metric.type,
      value: Number(Math.max(0, metric.value * multiplier + metricIndex * 1.7).toFixed(1)),
      unit: metric.unit,
      timestamp,
    }));
  });

  return {
    metrics: baseMetrics.map((metric) => ({ ...metric, timestamp: minutesAgo(1) })),
    history,
  };
}

function overview() {
  return {
    devices: {
      total: devices.length,
      online: devices.filter((device) => String(device.status).toLowerCase() === "online").length,
    },
    alarms: { open: alarms.filter((alarm) => String(alarm.status).toLowerCase() !== "closed").length },
    incidents: { open: incidents.filter((incident) => String(incident.status).toLowerCase() !== "closed").length },
    tickets: { open: tickets.filter((ticket) => !["closed", "resolved"].includes(String(ticket.status).toLowerCase())).length },
    problems: { open: problems.filter((problem) => String(problem.status).toLowerCase() !== "closed").length },
  };
}

export const handlers = [
  http.get(`${API_BASE_URL}/status`, () => HttpResponse.json(overview())),
  http.get(`${API_BASE_URL}/devices`, () => HttpResponse.json({ data: devices })),
  http.get(`${API_BASE_URL}/alarms`, () => HttpResponse.json({ data: alarms })),
  http.get(`${API_BASE_URL}/incidents`, () => HttpResponse.json({ data: incidents })),
  http.get(`${API_BASE_URL}/tickets`, () => HttpResponse.json({ data: tickets })),
  http.get(`${API_BASE_URL}/problems`, () => HttpResponse.json({ data: problems })),
  http.get(`${API_BASE_URL}/groups`, () => HttpResponse.json({ data: groups })),
  http.get(`${API_BASE_URL}/employees`, () => HttpResponse.json({ data: employees })),
  http.post(`${API_BASE_URL}/groups`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; description?: string };
    const group = { id: `grp-${Date.now()}`, name: body.name ?? "New Group", description: body.description ?? "" };
    groups.push(group);
    return HttpResponse.json(group);
  }),
  http.post(`${API_BASE_URL}/employees`, async ({ request }) => {
    const body = (await request.json()) as { group_id?: string; name?: string; email?: string; role?: string };
    const group = groups.find((entry) => entry.id === body.group_id);
    const employee = {
      id: `emp-${Date.now()}`,
      name: body.name ?? "New Employee",
      email: body.email ?? "new.employee@sentrynet.local",
      role: body.role ?? "Operator",
      group_id: body.group_id ?? groups[0].id,
      group,
    };
    employees.push(employee);
    return HttpResponse.json(employee);
  }),
  http.patch(`${API_BASE_URL}/tickets/:ticketId/status`, async ({ params, request }) => {
    const body = (await request.json()) as { status?: string };
    const ticket = tickets.find((entry) => entry.id === params.ticketId);

    if (!ticket || !body.status) {
      return HttpResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    ticket.status = body.status;
    return HttpResponse.json(ticket);
  }),
  http.get(`${API_BASE_URL}/tickets/:ticketId/notes`, ({ params }) =>
    HttpResponse.json({ data: ticketNotes[String(params.ticketId)] ?? [] }),
  ),
  http.post(`${API_BASE_URL}/tickets/:ticketId/notes`, async ({ params, request }) => {
    const body = (await request.json()) as { body?: string };
    const ticketId = String(params.ticketId);
    const nextNote = {
      id: `note-${Date.now()}`,
      ticketId,
      body: body.body ?? "",
      authorName: "Network Admin",
      createdAt: new Date().toISOString(),
    };

    ticketNotes[ticketId] = [...(ticketNotes[ticketId] ?? []), nextNote];
    return HttpResponse.json(nextNote);
  }),
  http.get(`${API_BASE_URL}/devices/:deviceId/metrics`, ({ params }) =>
    HttpResponse.json(metricHistory(String(params.deviceId))),
  ),
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const validAdmin = body.email === "admin@sentrynet.local" && body.password === "Password1!";
    const validOperator = body.email === "ops@sentrynet.local" && body.password === "secret";

    if (validAdmin || validOperator) {
      const role = validAdmin ? "Admin" : "Operator";
      const username = validAdmin ? "Network Admin" : "Network Operator";
      return HttpResponse.json({
        token: validAdmin ? "admin-token-123" : "operator-token-123",
        role,
        user: { username, role },
      });
    }

    return HttpResponse.json({ error: "Login failed" }, { status: 401 });
  }),
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; email?: string };
    return HttpResponse.json({
      token: "registered-token-456",
      role: "Viewer",
      user: { username: body.username ?? body.email ?? "New User", role: "Viewer" },
    });
  }),
];
