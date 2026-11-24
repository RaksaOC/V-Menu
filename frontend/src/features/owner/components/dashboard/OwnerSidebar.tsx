import { BarChart3, Box, Home, Users } from "lucide-react";

export const QUICK_ACTIONS = [
    { name: "Dashboard Overview", icon: BarChart3, id: "overview" },
    { name: "All Restaurants", icon: Box, id: "restaurants" },
    { name: "Staff Management", icon: Users, id: "staff" },
];

/** The owner's side menu: "Manage Restaurants" and the views across all restaurants. */
export function OwnerSidebar({
    activeItem,
    onManage,
    onQuickAction,
}: {
    activeItem: string;
    onManage: () => void;
    onQuickAction: (id: string) => void;
}) {
    return (
        <>
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--body)] uppercase tracking-wide flex items-center gap-2">
                    <Home size={16} /> Restaurant Management
                </h3>

                <button
                    onClick={onManage}
                    className="w-full bg-[var(--btn-bg)] text-[var(--btn-ink)] font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                    <Home size={18} /> Manage Restaurants
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--body)] uppercase tracking-wide flex items-center gap-2">
                    ⚡ Quick Actions
                </h3>

                <div className="space-y-1">
                    {QUICK_ACTIONS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onQuickAction(item.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeItem === item.id
                                        ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                                        : "text-[var(--body)] hover:bg-[var(--card)]"
                                }`}
                            >
                                <Icon size={18} /> {item.name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
