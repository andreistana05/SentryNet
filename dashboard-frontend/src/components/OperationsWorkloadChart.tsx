import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatChartValue } from "../lib/charts";
import type { OperationsWorkloadDatum } from "../types/domain";

interface OperationsWorkloadChartProps {
  data: OperationsWorkloadDatum[];
  loading: boolean;
}

function OperationsWorkloadChart({ data, loading }: OperationsWorkloadChartProps) {
  return (
    <section className="table-container chart-panel">
      <div className="table-header">
        <div>
          <span className="eyebrow">Operational Load</span>
          <h3>Current workflow volume</h3>
        </div>
      </div>

      {loading ? <div className="table-state">Loading chart data...</div> : null}
      {!loading && data.length === 0 ? <div className="table-state">No operational workload data is available yet.</div> : null}

      {!loading && data.length > 0 ? (
        <div className="chart-canvas chart-canvas-bar">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#9fb1c9", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9fb1c9", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value) => formatChartValue(Number(value ?? 0))}
                contentStyle={{ background: "#081221", border: "1px solid rgba(148, 163, 184, 0.16)", borderRadius: "16px" }}
              />
              <Bar dataKey="value" radius={[12, 12, 4, 4]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </section>
  );
}

export default OperationsWorkloadChart;
