import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import AppShell from "../components/AppShell";
import OperationsTable, { type OperationsTableColumn } from "../components/OperationsTable";
import {
  getMutationErrorMessage,
  useCreateTicketNoteMutation,
  useDashboardOverview,
  useDevices,
  useOperations,
  useTicketNotes,
  useUpdateTicketStatusMutation,
} from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { formatTimestamp, statusClassName } from "../lib/formatters";
import { TICKET_STATUS_OPTIONS } from "../services/dashboardService";
import type { Alarm, Device, Incident, OperationType, Problem, Ticket, TicketNote, TicketStatus } from "../types/domain";

const EMPTY_DEVICES: Device[] = [];

const pageCopy = {
  alarms: {
    eyebrow: "Alarm Queue",
    summaryLabel: "Open alarms needing correlation or escalation",
  },
  incidents: {
    eyebrow: "Incident Desk",
    summaryLabel: "Incidents currently under response",
  },
  tickets: {
    eyebrow: "Ticketing",
    summaryLabel: "Tickets driving the work queue",
  },
  problems: {
    eyebrow: "Problem Management",
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

function TicketNotesComposer({
  ticket,
  isOpen,
  onToggle,
}: {
  ticket: Ticket;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const composerId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [menuPosition, setMenuPosition] = useState<{ left: number; bottom: number; width: number } | null>(null);
  const notesQuery = useTicketNotes(isOpen ? ticket.id : null);
  const createNoteMutation = useCreateTicketNoteMutation();
  const notes = notesQuery.data ?? [];
  const submitError = createNoteMutation.isError
    ? getMutationErrorMessage(createNoteMutation.error, "We couldn't save the note.")
    : null;

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
        left: Math.max(16, rect.right - Math.max(rect.width, 360)),
        bottom: window.innerHeight - rect.top + 10,
        width: Math.max(rect.width, 360),
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !popupRef.current?.contains(target)) {
        onToggle();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onToggle();
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
  }, [isOpen, onToggle]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = draft.trim();
    if (!body) {
      return;
    }

    createNoteMutation.mutate(
      { ticketId: ticket.id, payload: { body } },
      {
        onSuccess: () => setDraft(""),
      },
    );
  }

  return (
    <div className="ticket-notes-composer" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`table-action-link ticket-notes-toggle${isOpen ? " is-active" : ""}`}
        onClick={onToggle}
        aria-label={`Open notes for ${String(ticket.title ?? ticket.name ?? ticket.id)}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${composerId}-dialog`}
      >
        Notes
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={popupRef}
              id={`${composerId}-dialog`}
              className="ticket-note-popup"
              role="dialog"
              aria-modal="false"
              aria-labelledby={`${composerId}-title`}
              style={{
                left: `${menuPosition.left}px`,
                bottom: `${menuPosition.bottom}px`,
                width: `${menuPosition.width}px`,
              }}
            >
              <div className="ticket-note-popup-header">
                <div>
                  <span className="eyebrow">Notes</span>
                  <h3 id={`${composerId}-title`}>{String(ticket.title ?? ticket.name ?? ticket.id)}</h3>
                </div>
              </div>

              <form className="ticket-note-composer" onSubmit={handleSubmit}>
                <div className="ticket-note-history">
                  {notesQuery.isLoading ? <div className="table-state">Loading notes...</div> : null}
                  {notesQuery.isError ? <div className="table-state error-state">We couldn't load notes.</div> : null}
                  {!notesQuery.isLoading && !notesQuery.isError && notes.length === 0 ? (
                    <div className="table-state">No notes yet for this ticket.</div>
                  ) : null}
                  {!notesQuery.isLoading && !notesQuery.isError && notes.length > 0 ? (
                    <div className="ticket-note-list">
                      {notes.map((note: TicketNote) => (
                        <article key={String(note.id)} className="ticket-note-card">
                          <div className="ticket-note-meta">
                            <strong>{note.authorName}</strong>
                            <span>{formatTimestamp(note.createdAt)}</span>
                          </div>
                          <p>{note.body}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
                <label htmlFor={`ticket-note-${ticket.id}`}>
                  <span>Add Comment</span>
                  <textarea
                    id={`ticket-note-${ticket.id}`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Add operator notes, vendor updates, or next actions..."
                    rows={6}
                  />
                </label>
                {submitError ? <div className="form-error">{submitError}</div> : null}
                <div className="ticket-note-popup-actions">
                  <button type="button" className="ghost-action ticket-note-cancel" onClick={onToggle}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="table-action-link ticket-note-submit"
                    disabled={!draft.trim() || createNoteMutation.isPending}
                  >
                    {createNoteMutation.isPending ? "Saving note..." : "Add note"}
                  </button>
                </div>
              </form>
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
  const [openNotesTicketId, setOpenNotesTicketId] = useState<string | number | null>(null);

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
      {
        key: "notes_action",
        label: "Notes",
        render: (_value, item) => (
          <TicketNotesComposer
            ticket={item as Ticket}
            isOpen={String(openNotesTicketId) === String((item as Ticket).id)}
            onToggle={() =>
              setOpenNotesTicketId((current) =>
                String(current) === String((item as Ticket).id) ? null : (item as Ticket).id,
              )
            }
          />
        ),
      },
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
      <section className="page-summary">
        <div className="page-summary-copy">
          <span className="eyebrow">{config.eyebrow}</span>
          <h2>{`${config.eyebrow} records`}</h2>
          {itemsQuery.isError ? (
            <div className="table-state error-state">{`We couldn't load ${type} from the backend.`}</div>
          ) : null}
        </div>

        <div className="summary-metrics">
          <div className="summary-metric">
            <span>Queue Size</span>
            <strong>{items.length}</strong>
          </div>
          <div className="summary-metric summary-metric-wide">
            <span>Focus</span>
            <strong>{config.summaryLabel}</strong>
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
