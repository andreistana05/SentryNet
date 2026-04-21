import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AppShell from "../components/AppShell";
import OperationsTable, { type OperationsTableColumn } from "../components/OperationsTable";
import {
  useDashboardOverview,
  useDevices,
  useOperations,
  useUpdateTicketStatusMutation,
} from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { statusClassName } from "../lib/formatters";
import { TICKET_STATUS_OPTIONS } from "../services/dashboardService";
import type { Alarm, Device, Incident, OperationType, Problem, Ticket, TicketStatus } from "../types/domain";

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

function TicketStatusEditor({
  ticket,
  isPending,
  onChange,
}: {
  ticket: Ticket;
  isPending: boolean;
  onChange: (ticketId: string | number, status: TicketStatus) => void;
}) {
  const selectId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ left: number; bottom: number; width: number } | null>(null);
  const title = String(ticket.title ?? ticket.name ?? ticket.ticket_number ?? ticket.id);
  const currentStatus = String(ticket.status || "assigned");
  const statusOptions = Array.from(new Set([currentStatus, ...TICKET_STATUS_OPTIONS]));

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function updateMenuPosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      setMenuPosition({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
        width: rect.width,
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    updateMenuPosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="ticket-status-editor" ref={containerRef}>
      <button
        id={selectId}
        type="button"
        ref={triggerRef}
        className={`ticket-status-trigger status-badge ${statusClassName(currentStatus)}`}
        onClick={() => setIsOpen((current) => !current)}
        disabled={isPending}
        aria-label={`Update status for ${title}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-menu`}
      >
        <span>{currentStatus}</span>
        <span className={`ticket-status-chevron${isOpen ? " is-open" : ""}`} aria-hidden="true" />
      </button>
      <span className="sr-only">{`Update status for ${title}`}</span>
      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="ticket-status-menu"
              id={`${selectId}-menu`}
              role="listbox"
              aria-labelledby={selectId}
              style={{
                left: `${menuPosition.left}px`,
                bottom: `${menuPosition.bottom}px`,
                width: `${menuPosition.width}px`,
              }}
            >
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`ticket-status-option${status === currentStatus ? " is-selected" : ""}`}
                  onClick={() => {
                    setIsOpen(false);
                    if (status !== currentStatus) {
                      onChange(ticket.id, status);
                    }
                  }}
                  role="option"
                  aria-selected={status === currentStatus}
                >
                  {status}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function OperationsPage({ type }: { type: OperationType }) {
  const overviewQuery = useDashboardOverview();
  const devicesQuery = useDevices();
  const itemsQuery = useOperations(type);
  const updateTicketStatusMutation = useUpdateTicketStatusMutation();
  const devices = devicesQuery.data ?? EMPTY_DEVICES;
  const items = itemsQuery.data ?? [];
  const config = pageCopy[type];
  const pendingTicketId = updateTicketStatusMutation.variables?.ticketId;

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
      { key: "alarm_number", label: "Alarm #" },
      { key: "alarm", label: "Description" },
      { key: "priority", label: "Priority", render: (value) => <StatusChip value={value} /> },
      { key: "status", label: "Status", render: (value) => <StatusChip value={value} /> },
      { key: "assigned_group", label: "Group" },
      { key: "assigned_person", label: "Assignee" },
      { key: "submit_date", label: "Submitted" },
    ],
    incidents: [
      { key: "incident_number", label: "Incident #" },
      { key: "description", label: "Description" },
      { key: "priority", label: "Priority", render: (value) => <StatusChip value={value} /> },
      { key: "status", label: "Status", render: (value) => <StatusChip value={value} /> },
      { key: "assigned_group", label: "Group" },
      { key: "assigned_person", label: "Assignee" },
      { key: "submit_date", label: "Submitted" },
    ],
    tickets: [
      { key: "ticket_number", label: "Ticket #" },
      { key: "title", label: "Title" },
      {
        key: "status",
        label: "Status",
        render: (_value, item) => (
          <TicketStatusEditor
            ticket={item as Ticket}
            isPending={updateTicketStatusMutation.isPending && String((item as Ticket).id) === String(pendingTicketId)}
            onChange={(ticketId, status) => updateTicketStatusMutation.mutate({ ticketId, status })}
          />
        ),
      },
      { key: "priority", label: "Priority", render: (value) => <StatusChip value={value} /> },
      { key: "assigned_group", label: "Team" },
      { key: "assigned_person", label: "Assignee" },
      { key: "submit_date", label: "Submitted" },
    ],
    problems: [
      { key: "problem_number", label: "Problem #" },
      { key: "alarm_name", label: "Alarm" },
      { key: "description", label: "Description" },
      { key: "status", label: "Status", render: (value) => <StatusChip value={value} /> },
      { key: "priority", label: "Priority", render: (value) => <StatusChip value={value} /> },
      { key: "assigned_group", label: "Group" },
      { key: "occurrence_count", label: "Occurrences" },
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
            <p>
              {type === "tickets"
                ? "Inline status changes are wired through a dedicated mutation hook and ready for a backend PATCH endpoint."
                : "Records on this page are loaded directly from the API."}
            </p>
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
