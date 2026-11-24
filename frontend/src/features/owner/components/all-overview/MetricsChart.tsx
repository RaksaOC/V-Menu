import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import type { OwnerOverview } from "@/features/owner/api";

// Orders, payments, items sold and menu items as bars.
interface MetricsChartProps {
    data: OwnerOverview;
    isVisible: boolean;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ data, isVisible }) => {
    const chartData = [
        { name: "Orders", value: data.orderCount, color: "var(--accent)" },
        { name: "Payments", value: data.paymentCount, color: "var(--ok)" },
        { name: "Items Sold", value: data.itemsSoldCount, color: "var(--ink)" },
        { name: "Menu Items", value: data.itemCount, color: "var(--muted)" },
    ];

    return (
        <div
            className={`
 bg-[var(--bg)] rounded-3xl p-6 border border-[var(--line)]
 transition-all duration-1000 ease-out flex flex-col justify-between
 ${isVisible ? " opacity-100" : " opacity-0"}
 `}
        >
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-[var(--btn-bg)] p-3 rounded-xl">
                    <Activity size={24} aria-hidden className="text-[var(--btn-ink)]" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-[var(--ink)]">Performance Metrics</h3>
                    <p className="text-[var(--muted)] text-sm">Key business indicators</p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 0, right: -10, left: -40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        }}
                    />
                    <Bar dataKey="value" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
