import { useMemo, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import DeviceTable from "../components/DeviceTable";
import API from "../services/api";

function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Never";
  const diff = Math.floor((Date.now() - new Date(lastSeen)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function Dashboard() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [devices, setDevices] = useState([]);
  const [overview, setOverview] = useState(null);

  const fetchData = () => {
    API.get("/status").then((r) => setOverview(r.data)).catch(console.error);
    API.get("/devices").then((r) => setDevices(r.data.data || [])).catch(console.error);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesStatus = statusFilter === "all" || device.status === statusFilter;
      const matchesType = typeFilter === "all" || device.type === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [devices, statusFilter, typeFilter]);

  const tableDevices = filteredDevices.map((d) => ({
    ...d,
    ip: d.ip_address,
    lastSeen: formatLastSeen(d.last_seen),
  }));

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <Header />

        <div className="dashboard-content">
          <h2>Infrastructure Overview</h2>

          <div className="metrics-grid">
            <MetricCard title="Total Devices" value={overview?.devices?.total ?? "-"} unit="" />
            <MetricCard title="Online Devices" value={overview?.devices?.online ?? "-"} unit="" />
            <MetricCard title="Offline Devices" value={overview?.devices?.offline ?? "-"} unit="" />
            <MetricCard title="Active Alerts" value={overview?.alarms?.open ?? "-"} unit="" />
          </div>

          <div className="filters-bar">
            <div className="filter-group">
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="server">Server</option>
                <option value="workstation">Workstation</option>
                <option value="router">Router</option>
                <option value="printer">Printer</option>
              </select>
            </div>
          </div>

          <DeviceTable devices={tableDevices} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
