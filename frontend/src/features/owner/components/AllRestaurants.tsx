import { useEffect, useState } from "react";
import { TrendingUp, UtensilsCrossed } from "lucide-react";
import { getRestaurantSummaries, type RestaurantSummary } from "@/features/owner/api";
import { restaurantCards } from "./restaurants/restaurant-cards";
import { RestaurantInsights } from "./restaurants/RestaurantInsights";
import { RestaurantStatCard } from "./restaurants/RestaurantStatCard";

interface Props {
    onManage: (id: string) => void;
}

/** Each of the owner's restaurants with its figures and a "Manage" button. */
export default function AllRestaurants({ onManage }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<RestaurantSummary[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setOverviewData(await getRestaurantSummaries());
            } catch (error) {
                console.error("Error fetching allRestaurants:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--line)]">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="h-4 bg-[var(--surface-2)] rounded-lg mb-3 w-24"></div>
                                    <div className="h-8 bg-[var(--surface-2)] rounded-lg w-16"></div>
                                </div>
                                <div className="w-12 h-12 bg-[var(--surface-2)] rounded-xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--ink)] mb-1">All Restaurant Overview</h2>
                    <p className="text-[var(--body)] text-sm">Real-time dashboard statistics for all restaurants</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-[var(--body)]">
                    <TrendingUp size={16} />
                    <span>Live data</span>
                </div>
            </div>

            {overviewData && overviewData.length > 0 ? (
                overviewData.map((restaurant, restaurantIndex) => (
                    <div key={restaurantIndex} className="space-y-4">
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--line)]">
                            <h3 className="text-lg font-semibold text-[var(--ink)]">{restaurant.resName}</h3>
                            <button
                                className="bg-[var(--btn-bg)] hover:opacity-90 text-[var(--btn-ink)] px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base justify-center"
                                onClick={() => onManage(restaurant.resId)}
                            >
                                <UtensilsCrossed size={16} /> Manage {restaurant.resName}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {restaurantCards(restaurant).map((card) => (
                                <RestaurantStatCard key={card.label} card={card} tableCount={restaurant.tableCount} />
                            ))}
                        </div>

                        <RestaurantInsights restaurant={restaurant} />
                    </div>
                ))
            ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-[var(--card)] rounded-full p-4 mb-4">
                        <TrendingUp size={32} className="text-[var(--muted)]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--body)] mb-2">No Data Available</h3>
                    <p className="text-[var(--muted)]">Overview statistics will appear here once data is available.</p>
                </div>
            )}
        </div>
    );
}
