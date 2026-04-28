import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import CustomSelect from "../components/CustomSelect";
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

  const deviceOptions = useMemo(() => {
    if (!devices.length) {
      return [{ value: "", label: "No devices available" }];
    }

    return devices.map((device) => ({
      value: String(device.id),
      label: `${device.name} (${device.type || "Unknown"})`,
    }));
  }, [devices]);

  return (
    <AppShell stats={stats}>
      <section className="page-summary metrics-page-summary">
        <div className="page-summary-copy">
          <span className="eyebrow">Device Metrics</span>
          <h2>Telemetry profile</h2>
          {devicesQuery.isError ? (
            <div className="table-state error-state">We couldn't load devices for the metrics view.</div>
          ) : null}
        </div>

        <div className="summary-metrics metrics-summary-metrics">
          <div className="summary-metric metrics-asset-selector">
            <span>Selected Asset</span>
            <CustomSelect
              value={selectedDevice?.id ?? ""}
              options={deviceOptions}
              onChange={(value) => setSearchParams({ device: value })}
              disabled={!devices.length}
              ariaLabel="Select device for metrics"
            />
          </div>
          <div className="summary-metric">
            <span>Device Status</span>
            <strong>{selectedDevice?.status ?? "Unknown"}</strong>
            <small>{selectedDevice?.ipAddress ?? "IP unavailable"}</small>
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
