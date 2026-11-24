import type { Restaurant } from "@vmenu/contracts";
import Overview from "@/features/restaurant/components/Overview";
import Menu from "@/features/restaurant/components/Menu";
import Tables from "@/features/restaurant/components/Tables";
import Staff from "@/features/staff/components/Staff";
import Preferences from "@/features/owner/components/preferences/Preferences";
import { ResContext } from "@/lib/restaurant-context";
import type { RestaurantTab } from "./RestaurantTabs";

/** The selected tab's content for one restaurant. */
export function RestaurantPanel({
    restaurant,
    tab,
    onSettingsSaved,
}: {
    restaurant: Restaurant;
    tab: RestaurantTab;
    onSettingsSaved: (settings: NonNullable<Restaurant["settings"]>) => void;
}) {
    return (
        <ResContext.Provider value={restaurant.slug}>
            {tab === "overview" && <Overview></Overview>}
            {tab === "menu" && <Menu role="owner" />}
            {tab === "tables" && <Tables role="owner" />}
            {tab === "staff" && <Staff></Staff>}
            {tab === "preferences" && (
                <Preferences onSaved={({ currency, khrPerUsd, paymentQrUrl }) => onSettingsSaved({ currency, khrPerUsd, paymentQrUrl })} />
            )}
        </ResContext.Provider>
    );
}
