import { NavLink } from "react-router-dom";

interface SidebarProps {
  totalDevices: number;
  onlineDevices: number;
  activeAlerts: number;
  openTickets: number;
  openProblems: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

function Sidebar({
  totalDevices,
  onlineDevices,
  activeAlerts,
  openTickets,
  openProblems,
  isCollapsed,
  onToggle,
}: SidebarProps) {
  const links = [
    { label: "Overview", to: "/dashboard", end: true },
    { label: "Metrics", to: "/dashboard/metrics", end: false },
    { label: "Alarms", to: "/dashboard/alarms", end: false },
    { label: "Incidents", to: "/dashboard/incidents", end: false },
    { label: "Tickets", to: "/dashboard/tickets", end: false },
    { label: "Problems", to: "/dashboard/problems", end: false },
    { label: "Groups", to :"/dashboard/groups", end: false},
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <div className="sidebar-header">
          <div className="brand-block">
            <div className="brand-mark">SN</div>
            {!isCollapsed && (
              <div className="brand-copy">
                <h2>SentryNet</h2>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            <span className={`sidebar-toggle-chevron ${isCollapsed ? "points-right" : "points-left"}`} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              title={link.label}
            >
              <span className="sidebar-link-dot" />
              {!isCollapsed && <span className="sidebar-link-label">{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!isCollapsed && (
          <div className="sidebar-summary">
            <span className="eyebrow sidebar-summary-title">Network Pulse</span>
            <div className="summary-grid summary-grid-extended">
              <div>
                <strong>{totalDevices}</strong>
                <span>Assets</span>
              </div>
              <div>
                <strong>{onlineDevices}</strong>
                <span>Online</span>
              </div>
              <div>
                <strong>{activeAlerts}</strong>
                <span>Alerts</span>
              </div>
              <div>
                <strong>{openTickets}</strong>
                <span>Tickets</span>
              </div>
              <div>
                <strong>{openProblems}</strong>
                <span>Problems</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
