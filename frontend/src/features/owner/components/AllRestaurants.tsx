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
                        <div key={index} className="bg-gray-50 rounded-2xl p-6 animate-pulse border border-gray-200">
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">All Restaurant Overview</h2>
                    <p className="text-gray-600 text-sm">Real-time dashboard statistics for all restaurants</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <TrendingUp size={16} />
                    <span>Live data</span>
                </div>
            </div>

            {overviewData && overviewData.length > 0 ? (
                overviewData.map((restaurant, restaurantIndex) => (
                    <div key={restaurantIndex} className="space-y-4">
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">{restaurant.resName}</h3>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base justify-center"
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
                    <div className="bg-gray-100 rounded-full p-4 mb-4">
                        <TrendingUp size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Available</h3>
                    <p className="text-gray-500">Overview statistics will appear here once data is available.</p>
                </div>
            )}
        </div>
    );
}
