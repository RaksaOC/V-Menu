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
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <Home size={16} /> Restaurant Management
                </h3>

                <button
                    onClick={onManage}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                    <Home size={18} /> Manage Restaurants
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">⚡ Quick Actions</h3>

                <div className="space-y-1">
                    {QUICK_ACTIONS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onQuickAction(item.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeItem === item.id ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
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
