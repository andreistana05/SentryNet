import Header from "./Header";
import Sidebar from "./Sidebar";

function AppShell({ children, stats }) {
  return (
    <div className="layout">
      <Sidebar
        totalDevices={stats.totalDevices}
        onlineDevices={stats.onlineDevices}
        activeAlerts={stats.activeAlerts}
        openTickets={stats.openTickets}
        openProblems={stats.openProblems}
      />

      <div className="main-content">
        <Header />
        <main className="dashboard-shell">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
