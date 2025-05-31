import React from "react";
import {useEffect, useState} from "react";
import axios from "axios";
import SkeletonOverviewCard from "@/app/[res]/common/SkeletonOverviewCard";
import {Users, Clock, Table, UtensilsCrossed, CheckCircle, CreditCard, TrendingUp, AlertTriangle} from "lucide-react";

import {Overview as OverviewData} from "@/app/shared/types/Overview";
import api from "@/app/shared/lib/axios";
import {useParams} from "next/navigation";

export default function Overview() {
    const params = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<OverviewData>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get(`/api/cashier/${params.res}/dashboard/overview`);
                setOverviewData(await response.data || {});
            } catch (error) {
                console.error("Error fetching overview:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const cards = overviewData ? [
        {
            label: "Active Tables",
            value: overviewData.numOfActiveTables,
            icon: Users,
            color: "from-emerald-500 to-teal-600",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
            textColor: "text-emerald-700 dark:text-emerald-400",
            priority: "high"
        },
        {
            label: "Unpaid Orders",
            value: overviewData.numOfUnpaidOrders,
            icon: AlertTriangle,
            color: "from-amber-500 to-orange-600",
            bgColor: "bg-amber-50 dark:bg-amber-900/20",
            textColor: "text-amber-700 dark:text-amber-400",
            priority: "urgent"
        },
        {
            label: "Total Tables",
            value: overviewData.numOfTables,
            icon: Table,
            color: "from-blue-500 to-indigo-600",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            textColor: "text-blue-700 dark:text-blue-400",
            priority: "normal"
        },
        {
            label: "Menu Items",
            value: overviewData.numOfItems,
            icon: UtensilsCrossed,
            color: "from-purple-500 to-violet-600",
            bgColor: "bg-purple-50 dark:bg-purple-900/20",
            textColor: "text-purple-700 dark:text-purple-400",
            priority: "normal"
        },
        {
            label: "Orders Completed",
            value: overviewData.numOfOrders,
            icon: CheckCircle,
            color: "from-green-500 to-emerald-600",
            bgColor: "bg-green-50 dark:bg-green-900/20",
            textColor: "text-green-700 dark:text-green-400",
            priority: "normal"
        },
        {
            label: "Payments Completed",
            value: overviewData.numOfPayments,
            icon: CreditCard,
            color: "from-cyan-500 to-blue-600",
            bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
            textColor: "text-cyan-700 dark:text-cyan-400",
            priority: "normal"
        }
    ] : [];

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({length: 6}).map((_, index) => (
                        <div key={index} className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-6 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded-lg mb-3 w-24"></div>
                                    <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded-lg w-16"></div>
                                </div>
                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Quick Stats Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">
                        Restaurant Overview
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Real-time dashboard statistics
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                    <TrendingUp size={16}/>
                    <span>Live data</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {cards && cards.length > 0 ? (
                    cards.map((card, index) => {
                        const Icon = card.icon;
                        const isUrgent = card.priority === "urgent";
                        const isHigh = card.priority === "high";

                        return (
                            <div
                                key={index}
                                className={`relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-500  hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-1 ${
                                    isUrgent ? "ring-2 ring-amber-200 dark:ring-amber-800" : ""
                                } ${
                                    isHigh ? "ring-2 ring-emerald-200 dark:ring-emerald-800" : ""
                                }`}
                            >
                                {/* Priority Indicator */}
                                {(isUrgent || isHigh) && (
                                    <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                                        isUrgent ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                                    }`}></div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${card.textColor} mb-1 uppercase tracking-wide`}>
                                            {card.label}
                                        </p>
                                        <div className="flex items-baseline space-x-2">
                                            <h3 className="text-3xl font-bold text-slate-800 dark:text-white">
                                                {card.value ?? 0}
                                            </h3>
                                            {isUrgent && card.value > 0 && (
                                                <span
                                                    className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                    Needs attention
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`${card.bgColor} p-3 rounded-xl`}>
                                        <div className={`bg-gradient-to-br ${card.color} p-2 rounded-lg`}>
                                            <Icon size={24} className="text-white"/>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar for certain metrics */}
                                {(card.label.includes("Active") || card.label.includes("Unpaid")) && (
                                    <div className="mt-4">
                                        <div
                                            className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            <span>Current</span>
                                            <span>{card.value} / {overviewData?.numOfTables || 0}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                            <div
                                                className={`bg-gradient-to-r ${card.color} h-2 rounded-full transition-all duration-500`}
                                                style={{
                                                    width: `${Math.min(((card.value || 0) / (overviewData?.numOfTables || 1)) * 100, 100)}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-4 mb-4">
                            <TrendingUp size={32} className="text-slate-400"/>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">
                            No Data Available
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            Overview statistics will appear here once data is available.
                        </p>
                    </div>
                )}
            </div>

            {/* Additional Insights */}
            {overviewData && (
                <div
                    className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                            <TrendingUp size={20} className="text-white"/>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                            Quick Insights
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                            <p className="text-slate-600 dark:text-slate-300">Table Occupancy</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {overviewData.numOfTables > 0
                                    ? Math.round((overviewData.numOfActiveTables / overviewData.numOfTables) * 100)
                                    : 0}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-600 dark:text-slate-300">Payment Completion</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {overviewData.numOfOrders > 0
                                    ? Math.round((overviewData.numOfPayments / overviewData.numOfOrders) * 100)
                                    : 0}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-600 dark:text-slate-300">Pending Actions</p>
                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                {overviewData.numOfUnpaidOrders}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}