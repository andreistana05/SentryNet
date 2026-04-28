import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import AppShell from "../components/AppShell";
import CustomSelect from "../components/CustomSelect";
import DeviceTable from "../components/DeviceTable";
import FleetStatusChart from "../components/FleetStatusChart";
import MetricCard from "../components/MetricCard";
import OperationsWorkloadChart from "../components/OperationsWorkloadChart";
import { useDashboardOverview, useDevices, useOperations } from "../hooks/useDashboardData";
import { buildStatusBreakdown, buildOperationsWorkload } from "../lib/charts";
import { buildDashboardStats } from "../lib/dashboard";
import { formatLastSeen, statusClassName } from "../lib/formatters";
import type { Alarm, Device, Incident, Problem, Ticket } from "../types/domain";

const EMPTY_DEVICES: Device[] = [];
const EMPTY_ALARMS: Alarm[] = [];
const EMPTY_INCIDENTS: Incident[] = [];
const EMPTY_TICKETS: Ticket[] = [];
const EMPTY_PROBLEMS: Problem[] = [];

function Dashboard() {
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    query: "",
  });
  const [isWorkQueuesExpanded, setIsWorkQueuesExpanded] = useState(true);
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

  const availableTypes = useMemo(() => {
    return Array.from(new Set(devices.map((device) => device.type).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [devices]);

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
      ...availableTypes.map((type) => ({
        value: String(type).toLowerCase(),
        label: String(type),
      })),
    ],
    [availableTypes],
  );

  const filteredDevices = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesStatus =
        filters.status === "all" || String(device.status).toLowerCase() === filters.status;
      const matchesType =
        filters.type === "all" || String(device.type).toLowerCase() === filters.type;
      const matchesQuery =
        !normalizedQuery ||
        [device.name, device.type, device.ipAddress, device.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [deferredQuery, devices, filters.status, filters.type]);

  const tableDevices = useMemo(() => {
    return filteredDevices.map((device) => ({
      ...device,
      ip: device.ipAddress || "Unavailable",
      lastSeenLabel: formatLastSeen(device.lastSeen, timeNow),
    }));
  }, [filteredDevices, timeNow]);

  const stats = useMemo(() => {
    return buildDashboardStats({
      overview: overviewQuery.data,
      devices,
      filteredCount: filteredDevices.length,
      alarms,
      incidents,
      tickets,
      problems,
    });
  }, [alarms, devices, filteredDevices.length, incidents, overviewQuery.data, problems, tickets]);

  const metricCards = [
    {
      title: "Open Alarms",
      value: stats.activeAlerts,
      label: "Threshold breaches or correlated signals awaiting operational handling",
      accent: "rose" as const,
      to: "/dashboard/alarms",
    },
    {
      title: "Open Incidents",
      value: stats.openIncidents,
      label: "Non-duplicate alarms promoted into incident response",
      accent: "amber" as const,
      to: "/dashboard/incidents",
    },
    {
      title: "Active Tickets",
      value: stats.openTickets,
      label: "Engineer-owned work items moving incidents toward closure",
      accent: "cyan" as const,
      to: "/dashboard/tickets",
    },
    {
      title: "Problem Records",
      value: stats.openProblems,
      label: "Recurring patterns escalated into root-cause investigation",
      accent: "green" as const,
      to: "/dashboard/problems",
    },
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
    overviewQuery.isError && devicesQuery.isError
      ? "We couldn't load the latest infrastructure snapshot."
      : "";

  const statusChartData = useMemo(() => buildStatusBreakdown(devices, stats), [devices, stats]);
  const workloadChartData = useMemo(() => buildOperationsWorkload(stats), [stats]);
  const workQueuesPanelId = "live-work-queues-panel";

  function updateFilter(key: "status" | "type" | "query", value: string) {
    startTransition(() => {
      setFilters((current) => ({ ...current, [key]: value }));
    });
  }

  return (
    <AppShell stats={stats}>
      <section className="metrics-grid">
        {metricCards.map((metric, index) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            label={metric.label}
            accent={metric.accent}
            delay={index}
            loading={isLoading}
            to={metric.to}
          />
        ))}
      </section>

      <section className="page-summary">
        <div className="page-summary-copy">
          <span className="eyebrow">Realtime Operations</span>
          <h2>Infrastructure overview</h2>
        </div>

        <div className="summary-metrics">
          <div className="summary-metric">
            <span>Service Health</span>
            <strong>{stats.healthyRatio}%</strong>
          </div>
          <div className="summary-metric">
            <span>Workflow Objects</span>
            <strong>
              {stats.activeAlerts + stats.openIncidents + stats.openTickets + stats.openProblems}
            </strong>
          </div>
          <div className="summary-metric">
            <span>Devices Visible</span>
            <strong>{stats.filtered}</strong>
          </div>
        </div>
      </section>

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
              placeholder="Search device, IP, type, status..."
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
            />
          </label>

          <label className="filter-group">
            <span>Status</span>
            <CustomSelect
              value={filters.status}
              options={statusOptions}
              onChange={(value) => updateFilter("status", value)}
              ariaLabel="Filter devices by status"
            />
          </label>

          <label className="filter-group">
            <span>Type</span>
            <CustomSelect
              value={filters.type}
              options={typeOptions}
              onChange={(value) => updateFilter("type", value)}
              ariaLabel="Filter devices by type"
            />
          </label>
        </div>
      </section>

      <DeviceTable
        devices={tableDevices}
        loading={isLoading}
        error={dataError}
        totalDevices={stats.totalDevices}
        filteredCount={stats.filtered}
      />

      <section className="chart-grid">
        <FleetStatusChart data={statusChartData} loading={isLoading} />
        <OperationsWorkloadChart data={workloadChartData} loading={isLoading} />
      </section>

      <section className="table-container">
        <div className="table-header">
          <div>
            <span className="eyebrow">Live Work Queues</span>
            <h3>Cross-links between alarms, incidents, tickets, and problems</h3>
          </div>

          <button
            className="panel-toggle"
            type="button"
            aria-controls={workQueuesPanelId}
            aria-expanded={isWorkQueuesExpanded}
            aria-label={isWorkQueuesExpanded ? "Collapse Live Work Queues" : "Expand Live Work Queues"}
            title={isWorkQueuesExpanded ? "Collapse Live Work Queues" : "Expand Live Work Queues"}
            onClick={() => setIsWorkQueuesExpanded((current) => !current)}
          >
            <ChevronDown aria-hidden="true" className="panel-toggle-icon" size={18} />
          </button>
        </div>

        <div id={workQueuesPanelId} className="queue-grid collapsible-panel-body" hidden={!isWorkQueuesExpanded}>
          {(
            [
              { key: "alarms", items: alarms },
              { key: "incidents", items: incidents },
              { key: "tickets", items: tickets },
              { key: "problems", items: problems },
            ] as const
          ).map(({ key: group, items }) => (
            <div key={group} className="queue-column">
              <h4>{group}</h4>
              {items.slice(0, 3).map((item, index) => {
                const raw = item as Record<string, unknown>;
                const displayId =
                  raw.alarm_number ??
                  raw.incident_number ??
                  raw.ticket_number ??
                  raw.problem_number ??
                  item.id ??
                  "Unlinked";
                const displayTitle =
                  (raw.alarm as string | undefined) ??
                  (raw.description as string | undefined) ??
                  (raw.alarm_name as string | undefined) ??
                  item.title ??
                  item.name ??
                  "Untitled record";
                return (
                  <div key={item.id ?? `${group}-${index}`} className="queue-card">
                    <div className="queue-card-top">
                      <strong>{String(displayId)}</strong>
                      <span className={`status-badge ${statusClassName(item.status)}`}>
                        {String(item.status ?? "unknown")}
                      </span>
                    </div>
                    <p>{String(displayTitle)}</p>
                  </div>
                );
              })}
              {items.length ? null : (
                <div className="queue-card">
                  <p>No {group} are currently available.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

export default Dashboard;
