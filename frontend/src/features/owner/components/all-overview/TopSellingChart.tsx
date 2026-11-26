import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Trophy } from "lucide-react";
import type { TopSeller } from "@/features/owner/api";

// The best sellers as a list and a donut chart.
interface TopSellingChartProps {
    data: TopSeller[];
    isVisible: boolean;
}

export const TopSellingChart: React.FC<TopSellingChartProps> = ({ data, isVisible }) => {
    const COLORS = ["var(--accent)", "var(--ok)", "var(--ink)", "var(--muted)", "var(--bad)"];

    return (
        <div
            className={`
 bg-[var(--bg)] rounded-3xl p-6 border border-[var(--line)]
 transition-all duration-1000 ease-out 
 ${isVisible ? " opacity-100" : " opacity-0"}
 `}
        >
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-[var(--btn-bg)] p-3 rounded-xl">
                    <Trophy size={24} aria-hidden className="text-[var(--btn-ink)]" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-[var(--ink)]">Top Selling Items</h3>
                    <p className="text-[var(--muted)] text-sm">Most popular menu items</p>
                </div>
            </div>

            <div className="flex flex-col justify-between">
                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div
                            key={item._id}
                            className={`
 flex items-center justify-between p-4
 transition-all duration-500 ease-out border-b border-b-gray-500 mb-2.5
 ${isVisible ? " opacity-100" : " opacity-0"}
 `}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                                <span className="font-semibold text-[var(--body)]">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-[family-name:var(--f-mono)] text-lg font-semibold text-[var(--ink)]">
                                    {item.quantity}
                                </span>
                                <p className="text-xs text-[var(--muted)]">sold</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={1} dataKey="quantity">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "white",
                                    border: "none",
                                    borderRadius: "12px",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
