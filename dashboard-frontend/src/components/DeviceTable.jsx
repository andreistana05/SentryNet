function DeviceTable({ devices, loading, error, totalDevices, filteredCount }) {
  const hasDevices = devices.length > 0;

  return (
    <section className="table-container">
      <div className="table-header">
        <div>
          <span className="eyebrow">Live Inventory</span>
          <h3>Monitored Devices</h3>
        </div>

        <div className="table-summary">
          <strong>{filteredCount}</strong>
          <span>of {totalDevices} visible</span>
        </div>
      </div>

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
              </tr>
            </thead>

            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td>
                    <div className="device-name-cell">
                      <strong>{device.name}</strong>
                      <span>Telemetry active</span>
                    </div>
                  </td>
                  <td>{device.type}</td>
                  <td>{device.ip}</td>
                  <td>
                    <span className={`status-badge ${String(device.status).toLowerCase()}`}>
                      {device.status}
                    </span>
                  </td>
                  <td>{device.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default DeviceTable;
