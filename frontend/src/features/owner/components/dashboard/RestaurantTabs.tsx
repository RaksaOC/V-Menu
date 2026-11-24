import { LayoutDashboard, Settings, Table2, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";

export type RestaurantTab = "overview" | "menu" | "tables" | "staff" | "preferences";

export const TABS: { id: RestaurantTab; label: string; icon: LucideIcon }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "menu", label: "Menu", icon: UtensilsCrossed },
    { id: "tables", label: "Tables", icon: Table2 },
    { id: "staff", label: "Staff", icon: Users },
    { id: "preferences", label: "Preferences", icon: Settings },
];

/** The tabs under the restaurant picker: overview, menu, tables, staff and preferences. */
export function RestaurantTabs({ selected, onSelect }: { selected: string; onSelect: (tab: RestaurantTab) => void }) {
    return (
        <div className="flex flex-wrap mt-4 gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
                <button
                    key={id}
                    onClick={() => onSelect(id)}
                    className={`px-3 md:px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 text-sm md:text-base ${selected === id ? "underline underline-offset-8 md:underline-offset-12 decoration-blue-600 decoration-2 md:decoration-3" : "decoration-0"}`}
                >
                    <Icon size={16} className="md:w-5 md:h-5" />
                    <p>{label}</p>
                </button>
            ))}
        </div>
    );
}
