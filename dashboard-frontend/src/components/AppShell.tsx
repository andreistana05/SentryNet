import { useState, type PropsWithChildren } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import type { DashboardStats } from "../types/domain";

interface AppShellProps extends PropsWithChildren {
  stats: DashboardStats;
}

function AppShell({ children, stats }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <div className={`layout ${isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-open"}`}>
      <Sidebar
        totalDevices={stats.totalDevices}
        onlineDevices={stats.onlineDevices}
        activeAlerts={stats.activeAlerts}
        openTickets={stats.openTickets}
        openProblems={stats.openProblems}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div className="main-content">
        <Header />
        <main className="dashboard-shell">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
