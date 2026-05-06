import { Info } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import CustomSelect from "../components/CustomSelect";
import MetricTrendChart, { type MetricTrendRange } from "../components/MetricTrendChart";
import { useDashboardOverview, useDeviceMetrics, useDeviceMetricsHistory, useDevices } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { buildMetricCards, buildMetricTrend } from "../lib/metrics";
import type { Device, MetricCardViewModel } from "../types/domain";

const EMPTY_DEVICES: Device[] = [];

function ThresholdPopover({ metric }: { metric: MetricCardViewModel }) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.offsetHeight ?? 190;
      const width = Math.min(300, window.innerWidth - 32);
      const left = Math.min(Math.max(16, triggerRect.right - width), window.innerWidth - width - 16);
      const belowTop = triggerRect.bottom + 10;
      const top = belowTop + popoverHeight > window.innerHeight - 16
        ? Math.max(16, triggerRect.top - popoverHeight - 10)
        : belowTop;

      setPosition({ left, top, width });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    updatePosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="metric-threshold-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Show thresholds for ${metric.label}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
      >
        <Info aria-hidden="true" size={16} strokeWidth={2.4} />
      </button>

      {isOpen && position
        ? createPortal(
            <div
              ref={popoverRef}
              className="metric-threshold-popover"
              id={popoverId}
              role="dialog"
              aria-label={`${metric.label} thresholds`}
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
                width: `${position.width}px`,
              }}
            >
              <div className="metric-threshold-popover-header">
                <span>Thresholds</span>
                <strong>{metric.label}</strong>
              </div>
              <div className="metric-threshold-levels">
                <div>
                  <span>Low</span>
                  <strong>{metric.thresholds.low}</strong>
                </div>
                <div>
                  <span>Medium</span>
                  <strong>{metric.thresholds.medium}</strong>
                </div>
                <div>
                  <span>High</span>
                  <strong>{metric.thresholds.high}</strong>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MetricsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState<MetricTrendRange>("1h");
  const overviewQuery = useDashboardOverview();
  const devicesQuery = useDevices();
  const devices = devicesQuery.data ?? EMPTY_DEVICES;
  const selectedDeviceId = searchParams.get("device");
  const selectedDevice = useMemo(
    () => devices.find((device) => String(device.id) === String(selectedDeviceId)) ?? null,
    [devices, selectedDeviceId],
  );
  // Latest-per-type: drives metric cards (always shows current values)
  const metricsQuery = useDeviceMetrics(selectedDevice?.id);
  // Time-range history: drives the trend chart
  const historyQuery = useDeviceMetricsHistory(selectedDevice?.id, range);

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

  const metricTrend = useMemo(() => {
    return buildMetricTrend(selectedDevice, historyQuery.data ?? null);
  }, [historyQuery.data, selectedDevice]);

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
              value={selectedDevice ? String(selectedDevice.id) : ""}
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
      <div className ="metrics-body">
      <section className="metrics-grid">
        {metricCards.map((metric, index) => (
          <article
            key={metric.key}
            className={`metric-card accent-${metric.accent} ${devicesQuery.isLoading ? "is-loading" : ""}`}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="metric-card-top">
              <span>{metric.label}</span>
              <div className="metric-card-actions">
                <ThresholdPopover metric={metric} />
                <div className="metric-orb" />
              </div>
            </div>

            <strong>{devicesQuery.isLoading ? "--" : metric.displayValue}</strong>
            <span className="metric-footnote">Last update: {metric.lastUpdated}</span>
          </article>
        ))}
      </section>

      <MetricTrendChart data={metricTrend} loading={historyQuery.isLoading} range={range} onRangeChange={setRange} />
      </div>
      {!selectedDevice && !devicesQuery.isLoading ? (
        <div className="table-state empty-state">
          No device is available yet. Once inventory loads, this page will attach the correct
          metric profile automatically.
        </div>
      ) : null}
    </AppShell>
  );
}

export default MetricsPage;
