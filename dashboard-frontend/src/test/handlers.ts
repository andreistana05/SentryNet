import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "../services/api";

const overview = {
  devices: { total: 4, online: 2 },
  alarms: { open: 3 },
  incidents: { open: 2 },
  tickets: { open: 5 },
  problems: { open: 1 },
};

const devices = [
  {
    id: "1",
    name: "Edge Router 1",
    type: "Router",
    status: "online",
    ip_address: "10.0.0.1",
    last_seen: "2026-04-08T10:00:00.000Z",
  },
  {
    id: "2",
    name: "Core Switch 1",
    type: "Switch",
    status: "warning",
    ip_address: "10.0.0.2",
    last_seen: "2026-04-08T09:58:00.000Z",
  },
  {
    id: "3",
    name: "Print Hub",
    type: "Printer",
    status: "offline",
    ip_address: "10.0.0.3",
    last_seen: "2026-04-07T09:58:00.000Z",
  },
  {
    id: "4",
    name: "VM Host",
    type: "Server",
    status: "unknown",
    ip_address: "10.0.0.4",
    last_seen: null,
  },
];

const alarms = [
  { id: "AL-1", title: "CPU threshold exceeded", source: "router", severity: "high", status: "open" },
  { id: "AL-2", title: "Packet loss detected", source: "switch", severity: "medium", status: "watching" },
];

const incidents = [
  { id: "IN-1", title: "Branch outage", priority: "p1", status: "investigating", owner: "NOC" },
];

const tickets = [
  { id: "TK-1", title: "Dispatch field engineer", status: "assigned", team: "Ops", assignee: "Alex" },
];

const problems = [
  { id: "PR-1", title: "Chronic WAN instability", status: "root-cause-analysis", owner: "Platform" },
];

const metrics = {
  metrics: [
    { name: "cpu_usage", value: 83, unit: "%", updatedAt: "2026-04-08T10:02:00.000Z" },
    { name: "latency", value: 120, unit: "ms", updatedAt: "2026-04-08T10:02:00.000Z" },
  ],
};

export const handlers = [
  http.get(`${API_BASE_URL}/status`, () => HttpResponse.json(overview)),
  http.get(`${API_BASE_URL}/devices`, () => HttpResponse.json({ data: devices })),
  http.get(`${API_BASE_URL}/alarms`, () => HttpResponse.json({ items: alarms })),
  http.get(`${API_BASE_URL}/incidents`, () => HttpResponse.json(incidents)),
  http.get(`${API_BASE_URL}/tickets`, () => HttpResponse.json({ data: tickets })),
  http.get(`${API_BASE_URL}/problems`, () => HttpResponse.json({ items: problems })),
  http.get(`${API_BASE_URL}/devices/:deviceId/metrics`, () => HttpResponse.json(metrics)),
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === "ops@sentrynet.local" && body.password === "secret") {
      return HttpResponse.json({ token: "token-123", role: "Operator" });
    }

    return HttpResponse.json({ error: "Login failed" }, { status: 401 });
  }),
  http.post(`${API_BASE_URL}/auth/register`, () =>
    HttpResponse.json({ token: "token-456", user: { role: "Operator" } }),
  ),
];
