import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import { chartPalette, formatChartValue} from "../lib/charts";
import type { StatusBreakdownDatum } from "../types/domain";

interface AlarmPriorityChartProps {
    data: StatusBreakdownDatum[];
    loading: boolean;
}

function AlarmPriorityChart({data, loading}: AlarmPriorityChartProps) {
    return (
        <section className="table-container chart-panel">
            <div className="table-header">
                <div>
                    <span className="eyebrow">Priority Breakdown</span>
                    <h3>Alarms by severity</h3>
                </div>
            </div>

            {loading ? <div className="table-state">Loading chart data...</div> : null }
            {!loading && data.length === 0 ? <div className="table-state">No alarm data available.</div> : null }

            {!loading && data.length > 0 ? (
                <div className="chart-shell">
                    <div className="chart-legend">
                        {data.map((entry) => (
                            <div key ={entry.name} className="chart-legend-row">
                                <span className="chart-legend-swatch" style={{backgroundColor: entry.color}}></span>
                                <span>{entry.name}</span>
                                <strong>{entry.value}</strong>
                            </div>
                        ))}
                    </div>
                    <div className="chart-canvas">
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={4}>
                                    {data.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} stroke={chartPalette.cyanSoft} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter ={(value) => formatChartValue(Number(value ?? 0))}
                                    contentStyle={{
                                        background: "var(--chart-tooltip-bg)",
                                        border: "1px solid rgba(148, 163, 184, 0.16)",
                                        borderRadius: "16px",
                                        color: "var(--chart-tooltip-text)",
                                    }}
                                    itemStyle={{color: "var(--chart-tooltip-text)"}}
                                    labelStyle={{color: "var(--chart-tooltip-label)"}}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

export default AlarmPriorityChart;