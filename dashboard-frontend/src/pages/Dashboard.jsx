import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import DeviceTable from "../components/DeviceTable";
import { mockDevices } from "../services/mockData";

function Dashboard() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const filteredDevices = useMemo(() => {
    return mockDevices.filter((device) => {
      const matchesStatus =
        statusFilter === "All" || device.status === statusFilter;

      const matchesType =
        typeFilter === "All" || device.type === typeFilter;

      return matchesStatus && matchesType;
    });
  }, [statusFilter, typeFilter]);

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <Header />

        <div className="dashboard-content">
          <h2>Infrastructure Overview</h2>

          <div className="metrics-grid">
            <MetricCard title="Total Devices" value="42" unit="" />
            <MetricCard title="Online Devices" value="37" unit="" />
            <MetricCard title="Offline Devices" value="5" unit="" />
            <MetricCard title="Active Alerts" value="3" unit="" />
          </div>

          <div className="filters-bar">
            <div className="filter-group">
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Warning">Warning</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Server">Server</option>
                <option value="Workstation">Workstation</option>
                <option value="Router">Router</option>
                <option value="Printer">Printer</option>
              </select>
            </div>
          </div>

          <DeviceTable devices={filteredDevices} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;