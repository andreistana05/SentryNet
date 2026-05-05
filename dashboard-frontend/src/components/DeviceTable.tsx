import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Device } from "../types/domain";

interface TableDevice extends Device {
  ip: string;
  lastSeenLabel: string;
}

interface DeviceTableProps {
  devices: TableDevice[];
  loading: boolean;
  error: string;
  totalDevices: number;
  filteredCount: number;
}

function DeviceTable({ devices, loading, error, totalDevices, filteredCount }: DeviceTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasDevices = devices.length > 0;
  const panelBodyId = "live-inventory-panel";

  return (
    <section className="table-container">
      <div className="table-header">
        <div>
          <span className="eyebrow">Live Inventory</span>
          <h3>Monitored Devices</h3>
        </div>

        <div className="table-header-actions">
          <div className="table-summary">
            <strong>{filteredCount}</strong>
            <span>of {totalDevices} visible</span>
          </div>

<<<<<<< HEAD
        </div>
      </div>

      <div className="collapsible-panel-body">
=======
          <button
            className="panel-toggle"
            type="button"
            aria-controls={panelBodyId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse Live Inventory" : "Expand Live Inventory"}
            title={isExpanded ? "Collapse Live Inventory" : "Expand Live Inventory"}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <ChevronDown aria-hidden="true" className="panel-toggle-icon" size={18} />
          </button>
        </div>
      </div>

      <div id={panelBodyId} className="collapsible-panel-body" hidden={!isExpanded}>
>>>>>>> 59f80ca (Make overview inventory and work queues collapsible)
        {error ? <div className="table-state error-state">{error}</div> : null}

        {loading ? (
          <div className="table-skeleton" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton-row" />
            ))}
          </div>
        ) : null}

        {!loading && !error && !hasDevices ? (
          <div className="table-state empty-state">
            No devices match the current filters. Try widening the search or status selection.
          </div>
        ) : null}

        {!loading && hasDevices ? (
          <div className="table-scroll">
            <table className="devices-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                  <th>Metrics</th>
                </tr>
              </thead>

              <tbody>
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <div className="device-name-cell">
                        <strong>{device.name}</strong>
<<<<<<< HEAD
=======
                        <span>Telemetry active</span>
>>>>>>> 59f80ca (Make overview inventory and work queues collapsible)
                      </div>
                    </td>
                    <td>{device.type}</td>
                    <td>{device.ip}</td>
                    <td>
                      <span className={`status-badge ${String(device.status).toLowerCase()}`}>
                        {device.status}
                      </span>
                    </td>
                    <td>{device.lastSeenLabel}</td>
                    <td>
                      <Link className="table-action-link" to={`/dashboard/metrics?device=${device.id}`}>
                        View metrics
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default DeviceTable;
