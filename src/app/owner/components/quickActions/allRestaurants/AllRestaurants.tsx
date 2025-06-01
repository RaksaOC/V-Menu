import React from "react";
import {useEffect, useState} from "react";
import {
    Users,
    Table,
    UtensilsCrossed,
    CheckCircle,
    CreditCard,
    TrendingUp,
    AlertTriangle,
    Plus,
    Settings
} from "lucide-react";
import api from "@/app/shared/lib/axios";
import {response} from "express";
import {Overview as OverviewData} from "@/app/shared/types/Overview";

interface AllRestaurants extends OverviewData {
    resId: string;
    resName: string;
}

interface Props {
    onManage: (id: string) => void;
}

export default function AllRestaurants({onManage}: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<AllRestaurants[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Replace this with: const response = await api.get(`/api/owner/allRestaurants`);
                const response = await api.get("/api/owner/allRestaurants");
                setOverviewData(response.data);
            } catch (error) {
                console.error("Error fetching allRestaurants:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const createCardsForRestaurant = (restaurantData: AllRestaurants) => {
        return [
            {
                label: "Active Tables",
                value: restaurantData.numOfActiveTables,
                icon: Users,
                color: "from-emerald-500 to-teal-600",
                bgColor: "bg-emerald-50",
                textColor: "text-emerald-700",
                priority: "high"
            },
            {
                label: "Unpaid Orders",
                value: restaurantData.numOfUnpaidOrders,
                icon: AlertTriangle,
                color: "from-amber-500 to-orange-600",
                bgColor: "bg-amber-50",
                textColor: "text-amber-700",
                priority: "urgent"
            },
            {
                label: "Total Tables",
                value: restaurantData.numOfTables,
                icon: Table,
                color: "from-blue-500 to-indigo-600",
                bgColor: "bg-blue-50",
                textColor: "text-blue-700",
                priority: "normal"
            },
            {
                label: "Menu Items",
                value: restaurantData.numOfItems,
                icon: UtensilsCrossed,
                color: "from-purple-500 to-violet-600",
                bgColor: "bg-purple-50",
                textColor: "text-purple-700",
                priority: "normal"
            },
            {
                label: "Orders Completed",
                value: restaurantData.numOfOrders,
                icon: CheckCircle,
                color: "from-green-500 to-emerald-600",
                bgColor: "bg-green-50",
                textColor: "text-green-700",
                priority: "normal"
            },
            {
                label: "Payments Completed",
                value: restaurantData.numOfPayments,
                icon: CreditCard,
                color: "from-cyan-500 to-blue-600",
                bgColor: "bg-cyan-50",
                textColor: "text-cyan-700",
                priority: "normal"
            }
        ];
    };

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({length: 6}).map((_, index) => (
                        <div key={index}
                             className="bg-gray-50 rounded-2xl p-6 animate-pulse border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded-lg mb-3 w-24"></div>
                                    <div className="h-8 bg-gray-200 rounded-lg w-16"></div>
                                </div>
                                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">
                        All Restaurant Overview
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Real-time dashboard statistics for all restaurants
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <TrendingUp size={16}/>
                    <span>Live data</span>
                </div>
            </div>

            {/* Restaurant Sections */}
            {overviewData && overviewData.length > 0 ? (
                overviewData.map((restaurant, restaurantIndex) => {
                    const cards = createCardsForRestaurant(restaurant);

                    return (
                        <div key={restaurantIndex} className="space-y-4">
                            {/* Restaurant Name Header */}
                            <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {restaurant.resName}
                                </h3>
                                <button
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base justify-center"
                                    onClick={() => {
                                        onManage(restaurant.resId)
                                        console.log("clicked to manage resId", restaurant.resId)
                                    }}>
                                    <UtensilsCrossed size={16}/> Manage {restaurant.resName}
                                </button>
                            </div>

                            {/* Stats Grid for this restaurant */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {cards.map((card, cardIndex) => {
                                    const Icon = card.icon;
                                    const isUrgent = card.priority === "urgent";
                                    const isHigh = card.priority === "high";

                                    return (
                                        <div
                                            key={cardIndex}
                                            className={`relative bg-white rounded-2xl border border-slate-200 p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                                                isUrgent ? "ring-2 ring-amber-300" : ""
                                            } ${
                                                isHigh ? "ring-2 ring-emerald-300" : ""
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
                                                        <h3 className="text-3xl font-bold text-gray-800">
                                                            {card.value ?? 0}
                                                        </h3>
                                                        {isUrgent && card.value > 0 && (
                                                            <span className="text-xs text-amber-600 font-medium">
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
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Current</span>
                                                        <span>{card.value} / {restaurant.numOfTables || 0}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`bg-gradient-to-r ${card.color} h-2 rounded-full transition-all duration-500`}
                                                            style={{
                                                                width: `${Math.min(((card.value || 0) / (restaurant.numOfTables || 1)) * 100, 100)}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Restaurant Insights */}
                            <div
                                className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                                        <TrendingUp size={20} className="text-white"/>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        {restaurant.resName} Insights
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="text-center">
                                        <p className="text-gray-600">Table Occupancy</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            {restaurant.numOfTables > 0
                                                ? Math.round((restaurant.numOfActiveTables / restaurant.numOfTables) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-600">Payment Completion</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {restaurant.numOfOrders > 0
                                                ? Math.round((restaurant.numOfPayments / restaurant.numOfOrders) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-600">Pending Actions</p>
                                        <p className="text-lg font-bold text-amber-600">
                                            {restaurant.numOfUnpaidOrders}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-4">
                        <TrendingUp size={32} className="text-gray-400"/>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                        No Data Available
                    </h3>
                    <p className="text-gray-500">
                        Overview statistics will appear here once data is available.
                    </p>
                </div>
            )}
        </div>
    );
}