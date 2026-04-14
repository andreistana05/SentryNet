import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useDashboardOverview, useDeviceMetrics, useDevices } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { buildMetricCards, getProfileKey, thresholdProfiles } from "../lib/metrics";
import type { Device } from "../types/domain";

const EMPTY_DEVICES: Device[] = [];

function MetricsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const overviewQuery = useDashboardOverview();
  const devicesQuery = useDevices();
  const devices = devicesQuery.data ?? EMPTY_DEVICES;
  const selectedDeviceId = searchParams.get("device");
  const selectedDevice = useMemo(
    () => devices.find((device) => String(device.id) === String(selectedDeviceId)) ?? null,
    [devices, selectedDeviceId],
  );
  const metricsQuery = useDeviceMetrics(selectedDevice?.id);

  useEffect(() => {
    if (!devices.length) return;
    const matched = devices.some((device) => String(device.id) === String(selectedDeviceId));
    if (!matched) {
      setSearchParams({ device: String(devices[0].id) }, { replace: true });
    }
  }, [devices, selectedDeviceId, setSearchParams]);

  const stats = useMemo(() => {
    return buildDashboardStats({
      overview: overviewQuery.data,
      devices,
    });
  }, [devices, overviewQuery.data]);

  const metricCards = useMemo(() => {
    return buildMetricCards(selectedDevice, metricsQuery.data ?? null);
  }, [metricsQuery.data, selectedDevice]);

  const activeProfile = thresholdProfiles[getProfileKey(selectedDevice?.type)] || thresholdProfiles.compute;

  const supportedProfiles = useMemo(() => {
    return Array.from(new Set(devices.map((device) => getProfileKey(device.type))));
  }, [devices]);

  return (
    <AppShell stats={stats}>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Device Metrics</span>
          <h2>Thresholds and live telemetry tailored to the device you are inspecting.</h2>
          <p>
            Servers and workstations keep compute-focused signals, network gear shifts toward
            transport health, and printers expose consumables instead of irrelevant system metrics.
          </p>
          {devicesQuery.isError ? (
            <div className="table-state error-state">We couldn't load devices for the metrics view.</div>
          ) : null}
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <span>Selected Asset</span>
            <strong>{selectedDevice?.name ?? (devicesQuery.isLoading ? "--" : "No device")}</strong>
            <p>
              {selectedDevice
                ? `${selectedDevice.type || "Unknown"} telemetry profile`
                : "Pick a device to inspect its available metrics."}
            </p>
          </div>
          <div className="hero-stat-card">
            <span>Profiles In Fleet</span>
            <strong>{supportedProfiles.length}</strong>
            <p>Telemetry templates currently represented by your monitored inventory.</p>
          </div>
        </div>
      </section>

      <section className="control-surface metrics-control-surface">
        <div className="control-copy">
          <span className="eyebrow">Telemetry Scope</span>
          <h3>Choose a device and review only the metrics that make sense for its role.</h3>
          <p>
            If the backend provides live readings, they appear here. Otherwise the page still
            shows the expected thresholds for that device class.
          </p>
        </div>

        <div className="filters-bar metrics-filters">
          <label className="filter-group">
            <span>Device</span>
            <select
              value={selectedDevice?.id ?? ""}
              onChange={(event) => setSearchParams({ device: event.target.value })}
              disabled={!devices.length}
            >
              {devices.length ? null : <option value="">No devices available</option>}
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.type || "Unknown"})
                </option>
              ))}
            </select>
          </label>

          <div className="metrics-context-card">
            <span className="metrics-context-label">Device Status</span>
            <strong>{selectedDevice?.status ?? "Unknown"}</strong>
            <p>{selectedDevice?.ipAddress ?? "IP address unavailable"}</p>
          </div>

          <div className="metrics-context-card">
            <span className="metrics-context-label">Telemetry Source</span>
            <strong>{metricsQuery.isLoading ? "Loading" : metricsQuery.data ? "Live API" : "Profile only"}</strong>
            <p>
              {metricsQuery.isLoading
                ? "Fetching latest device metrics."
                : "Thresholds remain visible even when the device is not reporting."}
            </p>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {metricCards.map((metric, index) => (
          <article
            key={metric.key}
            className={`metric-card accent-${metric.accent} ${devicesQuery.isLoading ? "is-loading" : ""}`}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="metric-card-top">
              <span>{metric.label}</span>
              <div className="metric-orb" />
            </div>

            <strong>{devicesQuery.isLoading ? "--" : metric.displayValue}</strong>
            <p>High threshold: {metric.thresholds.high}</p>
            <span className="metric-footnote">Last update: {metric.lastUpdated}</span>
          </article>
        ))}
      </section>

      <section className="table-container">
        <div className="table-header">
          <div>
            <span className="eyebrow">Threshold Matrix</span>
            <h3>Alert levels for {selectedDevice?.type ?? "the selected profile"}</h3>
          </div>
        </div>

        {!selectedDevice && !devicesQuery.isLoading ? (
          <div className="table-state empty-state">
            No device is available yet. Once inventory loads, this page will attach the correct
            metric profile automatically.
          </div>
        ) : null}

        {selectedDevice ? (
          <div className="table-scroll">
            <table className="devices-table metrics-threshold-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Low</th>
                  <th>Medium</th>
                  <th>High</th>
                </tr>
              </thead>
              <tbody>
                {activeProfile.map((metric) => (
                  <tr key={metric.key}>
                    <td>
                      <div className="device-name-cell">
                        <strong>{metric.label}</strong>
                        <span>{metric.unit === "C" ? "Unit: deg C" : `Unit: ${metric.unit}`}</span>
                      </div>
                    </td>
                    <td>{metric.thresholds.low}</td>
                    <td>{metric.thresholds.medium}</td>
                    <td>{metric.thresholds.high}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

export default MetricsPage;
