import type { RestaurantCard } from "./restaurant-cards";

/** One figure for a restaurant. "Urgent" and "high" cards get a ring, and table counts a bar. */
export function RestaurantStatCard({ card, tableCount }: { card: RestaurantCard; tableCount: number }) {
    const Icon = card.icon;
    const isUrgent = card.priority === "urgent";
    const isHigh = card.priority === "high";

    return (
        <div
            className={`relative bg-[var(--card)] rounded-[var(--r-card)] border border-[var(--line)] p-6 transition-all duration-300 ${
                isUrgent ? "ring-2 ring-[var(--accent)]" : ""
            } ${isHigh ? "ring-2 ring-[var(--ok)]" : ""}`}
        >
            {/* Priority Indicator */}
            {(isUrgent || isHigh) && (
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isUrgent ? "bg-[var(--accent)] " : "bg-[var(--ok)]"}`}></div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="mb-1 font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] text-[var(--muted)]">
                        {card.label}
                    </p>
                    <div className="flex items-baseline space-x-2">
                        <h3 className="font-[family-name:var(--f-mono)] text-3xl font-semibold text-[var(--ink)]">{card.value ?? 0}</h3>
                        {isUrgent && card.value > 0 && (
                            <span className="text-xs text-[var(--accent-text)] font-medium">Needs attention</span>
                        )}
                    </div>
                </div>

                <Icon size={22} aria-hidden className="text-[var(--muted)]" />
            </div>

            {/* Progress Bar for certain metrics */}
            {(card.label.includes("Active") || card.label.includes("Unpaid")) && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                        <span>Current</span>
                        <span>
                            {card.value} / {tableCount || 0}
                        </span>
                    </div>
                    <div className="w-full bg-[var(--surface-2)] rounded-full h-2">
                        <div
                            className="h-2 rounded-full bg-[var(--ink)] transition-all duration-500"
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
