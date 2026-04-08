import AppShell from "../components/AppShell";
import OperationsTable, { type OperationsTableColumn } from "../components/OperationsTable";
import { useDashboardOverview, useDevices, useOperations } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { statusClassName } from "../lib/formatters";
import type { Alarm, Device, Incident, OperationType, Problem, Ticket } from "../types/domain";

const EMPTY_DEVICES: Device[] = [];

const pageCopy = {
  alarms: {
    eyebrow: "Alarm Queue",
    title: "Generated alarms after threshold evaluation and deduplication.",
    description:
      "This view tracks newly generated alarms, correlated duplicates, and records that are still being watched before escalation.",
    summaryLabel: "Open alarms needing correlation or escalation",
  },
  incidents: {
    eyebrow: "Incident Desk",
    title: "Incidents created from non-duplicate alarms.",
    description:
      "Incidents represent the operational response layer: triage, ownership, mitigation, and next actions.",
    summaryLabel: "Incidents currently under response",
  },
  tickets: {
    eyebrow: "Ticketing",
    title: "Tickets used by teams to execute the incident response work.",
    description:
      "Operators assign engineers, update ticket status, add notes, and track concrete next actions until closure.",
    summaryLabel: "Tickets driving the work queue",
  },
  problems: {
    eyebrow: "Problem Management",
    title: "Problem records raised when recurring incidents reveal deeper issues.",
    description:
      "Recurring incident detection promotes operational noise into root-cause analysis and longer-term corrective action.",
    summaryLabel: "Problem investigations currently open",
  },
} as const;

function StatusChip({ value }: { value: unknown }) {
  const className = statusClassName(value);
  return <span className={`status-badge ${className}`}>{String(value || "unknown")}</span>;
}

function OperationsPage({ type }: { type: OperationType }) {
  const overviewQuery = useDashboardOverview();
  const devicesQuery = useDevices();
  const itemsQuery = useOperations(type);
  const devices = devicesQuery.data ?? EMPTY_DEVICES;
  const items = itemsQuery.data ?? [];
  const config = pageCopy[type];

  const stats = buildDashboardStats({
    overview: overviewQuery.data,
    devices,
    alarms: type === "alarms" ? items : undefined,
    incidents: type === "incidents" ? items : undefined,
    tickets: type === "tickets" ? items : undefined,
    problems: type === "problems" ? items : undefined,
  });

  const columns: Record<OperationType, OperationsTableColumn<Alarm | Incident | Ticket | Problem>[]> = {
    alarms: [
      { key: "id", label: "Alarm" },
      { key: "title", label: "Title" },
      { key: "source", label: "Source" },
      { key: "severity", label: "Severity", render: (value) => <StatusChip value={value} /> },
      { key: "status", label: "Status", render: (value) => <StatusChip value={value} /> },
      { key: "incidentId", label: "Incident" },
      { key: "ticketId", label: "Ticket" },
    ],
    incidents: [
      { key: "id", label: "Incident" },
      { key: "title", label: "Title" },
      { key: "priority", label: "Priority", render: (value) => <StatusChip value={value} /> },
      { key: "status", label: "Status", render: (value) => <StatusChip value={value} /> },
      { key: "owner", label: "Owner" },
      { key: "linkedTicket", label: "Ticket" },
      { key: "nextAction", label: "Next Action" },
    ],
    tickets: [
      { key: "id", label: "Ticket" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status", render: (value) => <StatusChip value={value} /> },
      { key: "team", label: "Team" },
      { key: "assignee", label: "Assignee" },
      { key: "incidentId", label: "Incident" },
      { key: "note", label: "Latest Note" },
    ],
    problems: [
      { key: "id", label: "Problem" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status", render: (value) => <StatusChip value={value} /> },
      { key: "owner", label: "Owner" },
      { key: "linkedIncident", label: "Linked Incident" },
      { key: "impact", label: "Impact" },
    ],
  };

  return (
    <AppShell stats={stats}>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">{config.eyebrow}</span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
          {itemsQuery.isError ? (
            <div className="table-state error-state">{`We couldn't load ${type} from the backend.`}</div>
          ) : null}
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <span>Queue Size</span>
            <strong>{items.length}</strong>
            <p>{config.summaryLabel}</p>
          </div>
          <div className="hero-stat-card">
            <span>Backend Source</span>
            <strong>/{type}</strong>
            <p>Records on this page are loaded directly from the API.</p>
          </div>
        </div>
      </section>

      <OperationsTable
        eyebrow={config.eyebrow}
        title={`${config.eyebrow} records`}
        items={items}
        columns={columns[type]}
        emptyMessage={`No ${type} are available right now.`}
      />
    </AppShell>
  );
}

export default OperationsPage;
