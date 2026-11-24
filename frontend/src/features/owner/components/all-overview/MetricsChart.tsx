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
        { name: "Orders", value: data.orderCount, color: "#3B82F6" },
        { name: "Payments", value: data.paymentCount, color: "#10B981" },
        { name: "Items Sold", value: data.itemsSoldCount, color: "#8B5CF6" },
        { name: "Menu Items", value: data.itemCount, color: "#F59E0B" },
    ];

    return (
        <div
            className={`
      bg-white rounded-3xl p-6 shadow-md border border-slate-200
      transition-all duration-1000 ease-out transform flex flex-col justify-between
      ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
    `}
        >
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
                    <Activity size={24} className="text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Performance Metrics</h3>
                    <p className="text-gray-500 text-sm">Key business indicators</p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 0, right: -10, left: -40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        }}
                    />
                    <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
