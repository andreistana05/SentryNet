import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import { chartPalette} from "../lib/charts";
import type { AlarmTrendDatum } from "../types/domain";

interface AlarmTrendChartProps {
    data: AlarmTrendDatum[];
    loading: boolean;
    eyebrow?: string;
    subtitle?: string;
}

function AlarmTrendChart({data, loading, eyebrow = "Alarm Trend", subtitle = "Volume over time" }: AlarmTrendChartProps) {
    return (
        <section className="table-container chart-panel">
            <div className="table-header">
                <div>
                    <span className="eyebrow">{eyebrow}</span>
                    <h3>{subtitle}</h3>
                </div>
            </div>
            {loading ? <div className="table-state">Loading chart data...</div> : null }
            {!loading && data.length === 0 ? <div className="table-state">No trend data available.</div> : null}

            {!loading && data.length > 0 ? (
                <div className="chart-canvas chart-canvas-bar">
                    <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={data} margin={{top: 8, right: 8, left: -16, bottom: 0}}>
                        <defs>
                            <linearGradient id="alarmTrendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartPalette.rose} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={chartPalette.rose} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                        <XAxis dataKey="date" tick={{fill: "var(--chart-tick)", fontSize: 11}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: "var(--chart-tick)", fontSize: 11}} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{
                                background: "var(--chart-tooltip-bg)",
                                border: "1px solid rgba(148, 163, 184, 0.16)",
                                borderRadius: "16px",
                                color: "var(--chart-tooltip-text)",
                            }}
                            itemStyle={{ color: "var(--chart-tooltip-text)" }}
                            labelStyle={{ color: "var(--chart-tooltip-label)" }}
                            cursor={{ stroke: chartPalette.rose, strokeWidth: 1, strokeDasharray: "4 2" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke={chartPalette.rose}
                                strokeWidth={2}
                                fill="url(#alarmTrendGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : null }
        </section>
    );
}

export default AlarmTrendChart;