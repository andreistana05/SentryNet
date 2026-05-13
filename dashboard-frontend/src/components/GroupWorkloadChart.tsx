import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartPalette } from "../lib/charts";
import type { GroupWorkloadDatum } from "../types/domain";

const DEFAULT_COLORS = [chartPalette.violet, chartPalette.orange, chartPalette.teal, chartPalette.sky];

interface GroupWorkloadChartProps {
    data: GroupWorkloadDatum[];
    loading: boolean;
    eyebrow?: string;
    subtitle?: string;
    colors?: string[];
}

function GroupWorkloadChart({
    data,
    loading,
    eyebrow = "Group Workload",
    subtitle = "Alarms per team",
    colors = DEFAULT_COLORS,
}: GroupWorkloadChartProps) {
    return (
        <section className="table-container chart-panel">
            <div className="table-header">
                <div>
                    <span className="eyebrow">{eyebrow}</span>
                    <h3>{subtitle}</h3>
                </div>
            </div>

            {loading ? <div className="table-state">Loading chart data...</div> : null}
            {!loading && data.length === 0 ? <div className="table-state">No group data available</div> : null }

            {!loading && data.length > 0 ? (
                <div className="chart-canvas chart-canvas-bar">
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={data} layout="vertical" margin={{top: 4, right: 12, left: 8, bottom: 0}}>
                            <XAxis
                                type="number"
                                tick={{ fill: "var(--chart-tick)", fontSize: 11}}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="group"
                                tick={{fill: "var(--chart-tick)", fontSize: 11}}
                                axisLine={false}
                                tickLine={false}
                                width={100}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--chart-tooltip-bg)",
                                    border: "1px solid rgba(148, 163, 184, 0.16)",
                                    borderRadius: "16px",
                                    color: "var(--chart-tooltip-text)",
                                }}
                                itemStyle={{ color: "var(--chart-tooltip-text)"}}
                                labelStyle={{ color: "var(--chart-tooltip-label)"}}
                                cursor={{ fill: "rgba(148, 163, 184, 0.08)"}}
                            />
                            <Bar dataKey="count" radius={[0,4,4,0]}>
                                {data.map((_, i) => (
                                    <Cell
                                        key={i}
                                        fill={colors[i % colors.length]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : null }
        </section>
    )
}

export default GroupWorkloadChart;