import { NavLink } from "react-router-dom";

function Sidebar({ totalDevices, onlineDevices, activeAlerts, openTickets, openProblems }) {
  const links = [
    { label: "Overview", to: "/dashboard" },
    { label: "Metrics", to: "/dashboard/metrics" },
    { label: "Alarms", to: "/dashboard/alarms" },
    { label: "Incidents", to: "/dashboard/incidents" },
    { label: "Tickets", to: "/dashboard/tickets" },
    { label: "Problems", to: "/dashboard/problems" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">SN</div>
        <div>
          <span className="eyebrow">Mission Control</span>
          <h2>SentryNet</h2>
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
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-summary">
        <span className="eyebrow">Network Pulse</span>
        <div className="summary-grid summary-grid-extended">
          <div>
            <strong>{totalDevices ?? 0}</strong>
            <span>Assets</span>
          </div>
          <div>
            <strong>{onlineDevices ?? 0}</strong>
            <span>Online</span>
          </div>
          <div>
            <strong>{activeAlerts ?? 0}</strong>
            <span>Alerts</span>
          </div>
          <div>
            <strong>{openTickets ?? 0}</strong>
            <span>Tickets</span>
          </div>
          <div>
            <strong>{openProblems ?? 0}</strong>
            <span>Problems</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
