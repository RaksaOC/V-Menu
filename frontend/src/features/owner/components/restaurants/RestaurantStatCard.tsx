import type { RestaurantCard } from "./restaurant-cards";

/** One figure for a restaurant. "Urgent" and "high" cards get a ring, and table counts a bar. */
export function RestaurantStatCard({ card, tableCount }: { card: RestaurantCard; tableCount: number }) {
    const Icon = card.icon;
    const isUrgent = card.priority === "urgent";
    const isHigh = card.priority === "high";

    return (
        <div
            className={`relative bg-white rounded-2xl border border-slate-200 p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                isUrgent ? "ring-2 ring-amber-300" : ""
            } ${isHigh ? "ring-2 ring-emerald-300" : ""}`}
        >
            {/* Priority Indicator */}
            {(isUrgent || isHigh) && (
                <div
                    className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isUrgent ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
                ></div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className={`text-sm font-medium ${card.textColor} mb-1 uppercase tracking-wide`}>{card.label}</p>
                    <div className="flex items-baseline space-x-2">
                        <h3 className="text-3xl font-bold text-gray-800">{card.value ?? 0}</h3>
                        {isUrgent && card.value > 0 && <span className="text-xs text-amber-600 font-medium">Needs attention</span>}
                    </div>
                </div>

                <div className={`${card.bgColor} p-3 rounded-xl`}>
                    <div className={`bg-gradient-to-br ${card.color} p-2 rounded-lg`}>
                        <Icon size={24} className="text-white" />
                    </div>
                </div>
            </div>

            {/* Progress Bar for certain metrics */}
            {(card.label.includes("Active") || card.label.includes("Unpaid")) && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Current</span>
                        <span>
                            {card.value} / {tableCount || 0}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`bg-gradient-to-r ${card.color} h-2 rounded-full transition-all duration-500`}
                            style={{
                                width: `${Math.min(((card.value || 0) / (tableCount || 1)) * 100, 100)}%`,
                            }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
}
