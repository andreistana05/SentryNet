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
    { label: "Overview", to: "/dashboard" },
    { label: "Metrics", to: "/dashboard/metrics" },
    { label: "Alarms", to: "/dashboard/alarms" },
    { label: "Incidents", to: "/dashboard/incidents" },
    { label: "Tickets", to: "/dashboard/tickets" },
    { label: "Problems", to: "/dashboard/problems" },
  ];

  return (
    <div className="sidebar-shell">
      <button
        type="button"
        className={`sidebar-toggle ${isCollapsed ? "is-collapsed" : "is-open"}`}
        onClick={onToggle}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!isCollapsed}
      >
        <span className={`sidebar-toggle-chevron ${isCollapsed ? "points-right" : "points-left"}`} />
      </button>

      <aside className={`sidebar ${isCollapsed ? "collapsed" : "open"}`}>
        <div className="sidebar-scroll">
          <div className="sidebar-header">
            <div className="brand-block">
              <div className="brand-mark">SN</div>
              <div className="brand-copy">
                <span className="eyebrow">Mission Control</span>
                <h2>SentryNet</h2>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Primary">
            {links.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              >
                <span className="sidebar-link-dot" />
                <span className="sidebar-link-label">{link.label}</span>
              </NavLink>
            ))}
          </nav>

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
        </div>
      </aside>
    </div>
  );
}

export default Sidebar;
