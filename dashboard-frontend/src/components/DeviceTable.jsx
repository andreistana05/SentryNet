function DeviceTable({ devices }) {
    return (
      <div className="table-container">
        <h3>Monitored Devices</h3>
  
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
                <td>{device.name}</td>
                <td>{device.type}</td>
                <td>{device.ip}</td>
                <td>
                  <span
                    className={`status-badge ${device.status.toLowerCase()}`}
                  >
                    {device.status}
                  </span>
                </td>
                <td>{device.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  export default DeviceTable;