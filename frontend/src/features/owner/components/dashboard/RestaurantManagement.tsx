import { Plus } from "lucide-react";
import type { Restaurant } from "@vmenu/contracts";
import { MoneyProvider } from "@/components/money/MoneyProvider";
import { RestaurantPanel } from "./RestaurantPanel";
import { RestaurantPicker } from "./RestaurantPicker";
import { RestaurantTabs, TABS, type RestaurantTab } from "./RestaurantTabs";

/** "Restaurant Management": pick a restaurant, then a tab for it. */
export function RestaurantManagement({
    restaurants,
    selected,
    onSelect,
    tab,
    onTab,
    onAdd,
    onSettingsSaved,
}: {
    restaurants: Restaurant[];
    selected: Restaurant | null;
    onSelect: (restaurant: Restaurant) => void;
    tab: RestaurantTab;
    onTab: (tab: RestaurantTab) => void;
    onAdd: () => void;
    onSettingsSaved: (settings: NonNullable<Restaurant["settings"]>) => void;
}) {
    return (
        <div className="space-y-6">
            <div className="bg-[var(--bg)] rounded-xl p-4 md:p-6 border border-[var(--line)]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-[var(--ink)]">Restaurant Management</h2>
                        <p className="text-[var(--muted)] text-sm md:text-base">Select and manage your restaurant locations</p>
                    </div>
                    <button
                        className="bg-[var(--btn-bg)] hover:opacity-90 text-[var(--btn-ink)] px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base w-full sm:w-auto justify-center"
                        onClick={onAdd}
                    >
                        <Plus size={16} /> Add Restaurant
                    </button>
                </div>

                <RestaurantPicker
                    restaurants={restaurants}
                    selected={selected}
                    onChange={(restaurant) => {
                        onSelect(restaurant);
                        // "temp fix" kept from before: switching tabs reloads the content for the new restaurant
                        onTab(TABS.find((t) => t.id !== tab)?.id || "overview");
                    }}
                />

                <div className={"w-full mt-4 h-0.5 bg-[var(--surface-2)]"}></div>

                <RestaurantTabs selected={tab} onSelect={onTab} />
                <div className={"bg-[var(--card)] rounded-lg p-6 mt-4"}>
                    {/* VM-24: this restaurant's currency; reloaded on each tab, so a saved change shows */}
                    <MoneyProvider key={`${selected?.slug}:${tab}`} slug={selected?.slug ?? "-"}>
                        {selected && <RestaurantPanel restaurant={selected} tab={tab} onSettingsSaved={onSettingsSaved} />}
                    </MoneyProvider>
                </div>
            </div>
        </div>
    );
}
