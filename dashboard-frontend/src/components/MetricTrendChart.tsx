import { Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMetricValue } from "../lib/formatters";
import type { MetricTrendViewModel } from "../types/domain";

export type MetricTrendRange = "7d" | "1d" | "1h";

const rangeOptions: Array<{ key: MetricTrendRange; label: string; ms: number }> = [
  { key: "7d", label: "7 Day", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "1d", label: "1 Day", ms: 24 * 60 * 60 * 1000 },
  { key: "1h", label: "1 Hour", ms: 60 * 60 * 1000 },
];

const fallbackRangeLabels: Record<MetricTrendRange, string[]> = {
  "7d": ["7d", "5d", "3d", "1d", "12h", "Now"],
  "1d": ["24h", "18h", "12h", "6h", "3h", "Now"],
  "1h": ["55m", "45m", "35m", "25m", "15m", "Now"],
};

interface MetricTrendChartProps {
  data: MetricTrendViewModel;
  loading: boolean;
  range: MetricTrendRange;
  onRangeChange: (range: MetricTrendRange) => void;
}

function formatRangeTime(timestamp: number | undefined, range: MetricTrendRange, fallback: string): string {
  if (!timestamp) return fallback;

  if (range === "7d") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(timestamp));
  }

  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}

function formatTooltipTime(label: string | number, range: MetricTrendRange, hasHistory: boolean): string {
  if (!hasHistory) return String(label);

  const timestamp = Number(label);
  if (!Number.isFinite(timestamp)) return String(label);

  if (range === "7d") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(new Date(timestamp));
  }

  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}

function MetricTrendChart({ data, loading, range, onRangeChange }: MetricTrendChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedKey((current) => {
      const availableKeys = data.series.map((entry) => entry.key);
      return current && availableKeys.includes(current) ? current : availableKeys[0] ?? null;
    });
  }, [data.series]);

  const selectedSeries = useMemo(
    () => data.series.find((entry) => entry.key === selectedKey) ?? data.series[0] ?? null,
    [data.series, selectedKey],
  );

  const visiblePoints = useMemo(() => {
    if (!data.hasHistory) {
      const labels = fallbackRangeLabels[range];
      return data.points.map((point, index) => ({
        ...point,
        time: labels[index] ?? point.time,
      }));
    }

    const selectedRange = rangeOptions.find((entry) => entry.key === range) ?? rangeOptions[0];
    const latestTimestamp = Math.max(...data.points.map((point) => Number(point.timestamp ?? 0)));
    const minimumTimestamp = latestTimestamp - selectedRange.ms;

    return data.points
      .filter((point) => Number(point.timestamp ?? 0) >= minimumTimestamp)
      .map((point) => ({
        ...point,
        time: formatRangeTime(point.timestamp, range, point.time),
      }));
  }, [data.hasHistory, data.points, range]);

  function formatAxisValue(value: number): string {
    if (!selectedSeries) return String(value);
    return formatMetricValue(value, selectedSeries.unit);
  }

  return (
    <section className="table-container chart-panel metric-trend-panel">
      <div className="table-header">
        <div>
          <span className="eyebrow">Telemetry Trend</span>
          <h3>{selectedSeries?.label ?? "Metric trend"}</h3>
        </div>
        <div className="metric-trend-actions">
          <div className="metric-range-control" aria-label="Select telemetry timeline">
            {rangeOptions.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={range === entry.key ? "is-active" : ""}
                onClick={() => onRangeChange(entry.key)}
                aria-pressed={range === entry.key}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div className="metric-trend-badge" aria-label="Selected metric unit">
            <Activity aria-hidden="true" size={16} strokeWidth={2.4} />
            <span>{selectedSeries?.unit ?? "--"}</span>
          </div>
        </div>
      </div>

      {loading ? <div className="table-state">Loading trend data...</div> : null}
      {!loading && data.series.length === 0 ? (
        <div className="table-state">No reporting metrics are available for the trend yet.</div>
      ) : null}

      {!loading && data.series.length > 0 && selectedSeries ? (
        <div className="metric-trend-layout">
          <div className="chart-canvas metric-trend-canvas">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={visiblePoints} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey={data.hasHistory ? "timestamp" : "time"}
                  type={data.hasHistory ? "number" : "category"}
                  domain={data.hasHistory ? ["dataMin", "dataMax"] : undefined}
                  tick={{ fill: "var(--chart-tick)", fontSize: 12 }}
                  tickFormatter={(value) => data.hasHistory ? formatRangeTime(Number(value), range, String(value)) : String(value)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "var(--chart-tick)", fontSize: 12 }}
                  tickFormatter={(value) => formatAxisValue(Number(value))}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(value) => [formatMetricValue(Number(value ?? 0), selectedSeries.unit), selectedSeries.label]}
                  labelFormatter={(label) => formatTooltipTime(label, range, data.hasHistory)}
                  contentStyle={{
                    background: "var(--chart-tooltip-bg)",
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                    borderRadius: "16px",
                    color: "var(--chart-tooltip-text)",
                  }}
                  itemStyle={{ color: "var(--chart-tooltip-text)" }}
                  labelStyle={{ color: "var(--chart-tooltip-label)" }}
                />
                {selectedSeries.thresholdValue !== null ? (
                  <ReferenceLine
                    y={selectedSeries.thresholdValue}
                    stroke="var(--chart-threshold)"
                    strokeDasharray="6 6"
                    strokeWidth={2}
                    label={{
                      value: `High ${formatMetricValue(selectedSeries.thresholdValue, selectedSeries.unit)}`,
                      position: "insideTopRight",
                      fill: "var(--chart-threshold-text)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  />
                ) : null}
                <Line
                  key={selectedSeries.key}
                  type="monotone"
                  dataKey={selectedSeries.key}
                  name={selectedSeries.label}
                  stroke={selectedSeries.color}
                  strokeWidth={3}
                  connectNulls
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend metric-trend-legend">
            {data.series.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`chart-legend-row metric-trend-option ${selectedSeries.key === entry.key ? "is-active" : ""}`}
                onClick={() => setSelectedKey(entry.key)}
                aria-pressed={selectedSeries.key === entry.key}
              >
                <span className="chart-legend-swatch" style={{ backgroundColor: entry.color }} />
                <span>{entry.label}</span>
                <strong>{entry.displayValue}</strong>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default MetricTrendChart;
