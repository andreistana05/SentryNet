import { startTransition, useDeferredValue, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import CustomSelect from "../components/CustomSelect";
import DeviceTable from "../components/DeviceTable";
import MetricCard from "../components/MetricCard";
import FleetStatusChart from "../components/FleetStatusChart";
import OperationsWorkloadChart from "../components/OperationsWorkloadChart";
import { buildOperationsWorkload, buildStatusBreakdown } from "../lib/charts";
import { useDashboardOverview, useDevices, useOperations } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { formatLastSeen, statusClassName } from "../lib/formatters";
import type { Alarm, Device, Incident, Problem, Ticket } from "../types/domain";

const EMPTY_DEVICES: Device[] = [];
const EMPTY_ALARMS: Alarm[] = [];
const EMPTY_INCIDENTS: Incident[] = [];
const EMPTY_TICKETS: Ticket[] = [];
const EMPTY_PROBLEMS: Problem[] = [];

function Dashboard() {
  const [filters, setFilters] = useState({ status: "all", type: "all", query: "" });
  const [timeNow] = useState(() => Date.now());

  const overviewQuery = useDashboardOverview();
  const devicesQuery = useDevices();
  const alarmsQuery = useOperations("alarms");
  const incidentsQuery = useOperations("incidents");
  const ticketsQuery = useOperations("tickets");
  const problemsQuery = useOperations("problems");

  const devices = devicesQuery.data ?? EMPTY_DEVICES;
  const alarms = alarmsQuery.data ?? EMPTY_ALARMS;
  const incidents = incidentsQuery.data ?? EMPTY_INCIDENTS;
  const tickets = ticketsQuery.data ?? EMPTY_TICKETS;
  const problems = problemsQuery.data ?? EMPTY_PROBLEMS;

  const deferredQuery = useDeferredValue(filters.query);

  const availableTypes = useMemo(
    () => Array.from(new Set(devices.map((d) => d.type).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [devices],
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      { value: "online", label: "Online" },
      { value: "offline", label: "Offline" },
      { value: "unknown", label: "Unknown" },
      { value: "warning", label: "Warning" },
    ],
    [],
  );

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "All types" },
      ...availableTypes.map((type) => ({ value: String(type).toLowerCase(), label: String(type) })),
    ],
    [availableTypes],
  );

  const filteredDevices = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return devices.filter((device) => {
      const matchesStatus = filters.status === "all" || String(device.status).toLowerCase() === filters.status;
      const matchesType = filters.type === "all" || String(device.type).toLowerCase() === filters.type;
      const matchesQuery =
        !q ||
        [device.name, device.type, device.ipAddress, device.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      return matchesStatus && matchesType && matchesQuery;
    });
  }, [deferredQuery, devices, filters.status, filters.type]);

  const tableDevices = useMemo(
    () => filteredDevices.map((d) => ({ ...d, ip: d.ipAddress || "Unavailable", lastSeenLabel: formatLastSeen(d.lastSeen, timeNow) })),
    [filteredDevices, timeNow],
  );

  const stats = useMemo(
    () =>
      buildDashboardStats({
        overview: overviewQuery.data,
        devices,
        filteredCount: filteredDevices.length,
        alarms,
        incidents,
        tickets,
        problems,
      }),
    [alarms, devices, filteredDevices.length, incidents, overviewQuery.data, problems, tickets],
  );

  const fleetStatus = useMemo(() => buildStatusBreakdown(devices, stats), [devices, stats]);
  const operationsWorkload = useMemo(() => buildOperationsWorkload(stats), [stats]);

  const metricCards = [
    { title: "Open Alarms", value: stats.activeAlerts, accent: "rose" as const, to: "/dashboard/alarms" },
    { title: "Open Incidents", value: stats.openIncidents, accent: "amber" as const, to: "/dashboard/incidents" },
    { title: "Active Tickets", value: stats.openTickets, accent: "cyan" as const, to: "/dashboard/tickets" },
    { title: "Problem Records", value: stats.openProblems, accent: "green" as const, to: "/dashboard/problems" },
  ];

  const isLoading = [
    overviewQuery.isLoading,
    devicesQuery.isLoading,
    alarmsQuery.isLoading,
    incidentsQuery.isLoading,
    ticketsQuery.isLoading,
    problemsQuery.isLoading,
  ].some(Boolean);

  const dataError =
    overviewQuery.isError && devicesQuery.isError ? "We couldn't load the latest infrastructure snapshot." : "";

  function updateFilter(key: "status" | "type" | "query", value: string) {
    startTransition(() => {
      setFilters((current) => ({ ...current, [key]: value }));
    });
  }

  const queueGroups = [
    { key: "alarms", label: "Alarms", items: alarms, count: alarms.length },
    { key: "incidents", label: "Incidents", items: incidents, count: incidents.length },
    { key: "tickets", label: "Tickets", items: tickets, count: tickets.length },
  ] as const;

  return (
    <AppShell stats={stats}>
      {/* Hero strip */}
      <section className="hero">
        <div className="hero-top">
          <span className="eyebrow">Mission Control</span>
          <h3>Infrastructure Overview</h3>
          <p className="hero-sub">
            {stats.totalDevices} assets &middot; {stats.onlineDevices} online
          </p>
        </div>
        <div className="metrics-grid">
          {metricCards.map((metric, index) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              accent={metric.accent}
              delay={index}
              loading={isLoading}
              to={metric.to}
            />
          ))}
        </div>
      </section>

      {/* Lower grid */}
      <div className="lower">
        {/* Left: filters + device table */}
        <div className="col">
          <section className="control-surface">
            <div className="control-copy">
              <span className="eyebrow">Fleet Explorer</span>
              <h3>Filter devices</h3>
            </div>
            <div className="filters-bar">
              <label className="filter-group filter-search">
                <span>Search</span>
                <input
                  type="search"
                  placeholder="Search devices by name, IP, type, status..."
                  value={filters.query}
                  onChange={(e) => updateFilter("query", e.target.value)}
                />
              </label>
              <label className="filter-group">
                <span>Status</span>
                <CustomSelect
                  value={filters.status}
                  options={statusOptions}
                  onChange={(v) => updateFilter("status", v)}
                  ariaLabel="Filter by status"
                />
              </label>
              <label className="filter-group">
                <span>Type</span>
                <CustomSelect
                  value={filters.type}
                  options={typeOptions}
                  onChange={(v) => updateFilter("type", v)}
                  ariaLabel="Filter by type"
                />
              </label>
            </div>
          </section>

          <div id="live-inventory-panel">
            <DeviceTable
              devices={tableDevices}
              loading={isLoading}
              error={dataError}
              totalDevices={stats.totalDevices}
              filteredCount={stats.filtered}
            />
            <div className="col-charts">
              <FleetStatusChart data={fleetStatus} loading={isLoading} />
              <OperationsWorkloadChart data={operationsWorkload} loading={isLoading} />
            </div>
          </div>
        </div>

        <div className="col col-right">
          <div id="live-work-queues-panel" className="work-queues-stack">
            {queueGroups.map(({ key, label, items }) => (
              <section key={key} className="panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">{label}</span>
                </div>
                <span className="meta">{items.length} active</span>
              </div>
              <div className="panel-queue">
                {items.map((item, index) => {
                  const raw = item as Record<string, unknown>;
                  const displayId =
                    raw.alarm_number ?? raw.incident_number ?? raw.ticket_number ?? item.id ?? "—";
                  const displayTitle =
                    (raw.alarm as string | undefined) ??
                    (raw.description as string | undefined) ??
                    (raw.alarm_name as string | undefined) ??
                    item.title ??
                    item.name ??
                    "Untitled";
                  return (
                    <div key={item.id ?? `${key}-${index}`} className="panel-queue-item">
                      <span className={`status-badge ${statusClassName(item.status)}`}>
                        {String(item.status ?? "unknown")}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <strong>#{String(displayId)}</strong>
                        <p>{String(displayTitle)}</p>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="table-state">No {label.toLowerCase()} at this time.</div>
                )}
              </div>
            </section>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default Dashboard;
