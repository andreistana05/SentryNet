import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import AppShell from "../components/AppShell";
import MetricCard from "../components/MetricCard";
import DeviceTable from "../components/DeviceTable";
import API from "../services/api";

function formatLastSeen(lastSeen, now) {
  if (!lastSeen) return "Never";

  const diff = Math.max(0, Math.floor((now - new Date(lastSeen).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function statusClassName(value) {
  return String(value || "unknown").toLowerCase().replace(/\s+/g, "-");
}

function Dashboard() {
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    query: "",
  });
  const [devices, setDevices] = useState([]);
  const [overview, setOverview] = useState(null);
  const [operations, setOperations] = useState({
    alarms: [],
    incidents: [],
    tickets: [],
    problems: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [timeNow, setTimeNow] = useState(Date.now());

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setDataError("");

      try {
        const [statusResponse, devicesResponse, alarmsResponse, incidentsResponse, ticketsResponse, problemsResponse] =
          await Promise.allSettled([
            API.get("/status"),
            API.get("/devices"),
            API.get("/alarms"),
            API.get("/incidents"),
            API.get("/tickets"),
            API.get("/problems"),
          ]);

        if (!isMounted) return;

        if (statusResponse.status === "fulfilled") {
          setOverview(statusResponse.value.data);
        }

        if (devicesResponse.status === "fulfilled") {
          setDevices(normalizeCollection(devicesResponse.value.data));
        }

        setOperations({
          alarms: alarmsResponse.status === "fulfilled" ? normalizeCollection(alarmsResponse.value.data) : [],
          incidents:
            incidentsResponse.status === "fulfilled"
              ? normalizeCollection(incidentsResponse.value.data)
              : [],
          tickets: ticketsResponse.status === "fulfilled" ? normalizeCollection(ticketsResponse.value.data) : [],
          problems:
            problemsResponse.status === "fulfilled" ? normalizeCollection(problemsResponse.value.data) : [],
        });

        if (statusResponse.status !== "fulfilled" && devicesResponse.status !== "fulfilled") {
          setDataError("We couldn't load the latest infrastructure snapshot.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeNow(Date.now());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const deferredQuery = useDeferredValue(filters.query);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(devices.map((device) => device.type).filter(Boolean))).sort(
      (left, right) => left.localeCompare(right),
    );
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesStatus =
        filters.status === "all" || String(device.status).toLowerCase() === filters.status;
      const matchesType =
        filters.type === "all" || String(device.type).toLowerCase() === filters.type;
      const matchesQuery =
        !normalizedQuery ||
        [device.name, device.type, device.ip_address, device.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [deferredQuery, devices, filters.status, filters.type]);

  const tableDevices = useMemo(() => {
    return filteredDevices.map((device) => ({
      ...device,
      ip: device.ip_address || "Unavailable",
      lastSeen: formatLastSeen(device.last_seen, timeNow),
    }));
  }, [filteredDevices, timeNow]);

  const stats = useMemo(() => {
    const totalDevices = overview?.devices?.total ?? devices.length;
    const onlineDevices =
      overview?.devices?.online ?? devices.filter((device) => device.status === "online").length;
    const filtered = filteredDevices.length;
    const healthyRatio = totalDevices ? Math.round((onlineDevices / totalDevices) * 100) : 0;

    return {
      totalDevices,
      onlineDevices,
      filtered,
      healthyRatio,
      activeAlerts: overview?.alarms?.open ?? operations.alarms.length,
      openTickets: overview?.tickets?.open ?? operations.tickets.length,
      openProblems: overview?.problems?.open ?? operations.problems.length,
      openIncidents: overview?.incidents?.open ?? operations.incidents.length,
    };
  }, [devices, filteredDevices.length, operations, overview]);

  const metricCards = [
    {
      title: "Open Alarms",
      value: stats.activeAlerts,
      label: "Threshold breaches or correlated signals awaiting operational handling",
      accent: "rose",
    },
    {
      title: "Open Incidents",
      value: stats.openIncidents,
      label: "Non-duplicate alarms promoted into incident response",
      accent: "amber",
    },
    {
      title: "Active Tickets",
      value: stats.openTickets,
      label: "Engineer-owned work items moving incidents toward closure",
      accent: "cyan",
    },
    {
      title: "Problem Records",
      value: stats.openProblems,
      label: "Recurring patterns escalated into root-cause investigation",
      accent: "green",
    },
  ];

  function updateFilter(key, value) {
    startTransition(() => {
      setFilters((current) => ({ ...current, [key]: value }));
    });
  }

  return (
    <AppShell stats={stats}>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Realtime Operations</span>
          <h2>Infrastructure visibility with a cleaner, more confident command center.</h2>
          <p>
            Track device health, review fleet activity, and spot issues faster with a
            dashboard designed to feel live and operational.
          </p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <span>Service Health</span>
            <strong>{stats.healthyRatio}%</strong>
            <p>Healthy footprint based on currently online devices.</p>
          </div>
          <div className="hero-stat-card">
            <span>Workflow Objects</span>
            <strong>
              {stats.activeAlerts + stats.openIncidents + stats.openTickets + stats.openProblems}
            </strong>
            <p>Total alarms, incidents, tickets, and problems currently visible.</p>
          </div>
        </div>
      </section>

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
          />
        ))}
      </section>

      <section className="control-surface">
        <div className="control-copy">
          <span className="eyebrow">Fleet Explorer</span>
          <h3>Filter devices while keeping the operational workflow in view.</h3>
          <p>
            Deferred search keeps interactions responsive while React updates the list in
            the background.
          </p>
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
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="unknown">Unknown</option>
              <option value="warning">Warning</option>
            </select>
          </label>

          <label className="filter-group">
            <span>Type</span>
            <select
              value={filters.type}
              onChange={(event) => updateFilter("type", event.target.value)}
            >
              <option value="all">All types</option>
              {availableTypes.map((type) => (
                <option key={type} value={String(type).toLowerCase()}>
                  {type}
                </option>
              ))}
            </select>
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

      <section className="table-container">
        <div className="table-header">
          <div>
            <span className="eyebrow">Live Work Queues</span>
            <h3>Cross-links between alarms, incidents, tickets, and problems</h3>
          </div>
        </div>

        <div className="queue-grid">
          {["alarms", "incidents", "tickets", "problems"].map((group) => (
            <div key={group} className="queue-column">
              <h4>{group}</h4>
              {(operations[group] ?? []).slice(0, 3).map((item, index) => (
                <div key={item.id ?? `${group}-${index}`} className="queue-card">
                  <div className="queue-card-top">
                    <strong>{item.id ?? "Unlinked"}</strong>
                    <span className={`status-badge ${statusClassName(item.status)}`}>
                      {item.status ?? "unknown"}
                    </span>
                  </div>
                  <p>{item.title ?? item.name ?? "Untitled record"}</p>
                </div>
              ))}
              {operations[group]?.length ? null : (
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
