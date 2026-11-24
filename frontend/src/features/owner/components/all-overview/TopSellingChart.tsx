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
    const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

    return (
        <div
            className={`
      bg-white rounded-3xl p-6 shadow-md border border-slate-200
      transition-all duration-1000 ease-out transform
      ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
    `}
        >
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl">
                    <Trophy size={24} className="text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Top Selling Items</h3>
                    <p className="text-gray-500 text-sm">Most popular menu items</p>
                </div>
            </div>

            <div className="flex flex-col justify-between">
                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div
                            key={item._id}
                            className={`
                flex items-center justify-between p-4
                transition-all duration-500 ease-out transform border-b border-b-gray-500 mb-2.5
                ${isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}
              `}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                                <span className="font-semibold text-gray-700">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold" style={{ color: COLORS[index] }}>
                                    {item.quantity}
                                </span>
                                <p className="text-xs text-gray-500">sold</p>
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
