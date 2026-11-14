'use client'

import {useEffect, useState} from "react";
import axios from "axios";
import MenuCard from "./MenuCard";
import SkeletonMenuCards from "@/app/[res]/common/SkeletonMenuCard";
import {ItemOutput} from "@/app/shared/types/Item";
import {jwtDecode} from "jwt-decode";
import api from "@/app/shared/lib/axios";
import {UtensilsCrossed, TrendingUp} from "lucide-react";
import {useParams} from "next/navigation";

const Menu = () => {
    const [menuItems, setMenuItems] = useState<ItemOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const params = useParams();

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await api.get(`/api/cashier/${params.res}/dashboard/menu`);
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchMenu();
    }, []);

    async function handleToggle(id: string) {
        const item = menuItems.find(item => item._id === id);
        let isEnabled = false;
        if (item) {
            isEnabled = item.isEnabled;
        }
        const res = await api.patch(`/api/cashier/${params.res}/dashboard/menu/${id}`, {isEnabled: isEnabled});

        setMenuItems((prev) =>
            prev.map((item) =>
                item._id === id ? {...item, isEnabled: !item.isEnabled} : item
            )
        );
    }

    if (loading) {
        return (<SkeletonMenuCards/>)
    }

    return (
        <div className="w-full space-y-6">

            {/* Menu Items Grid or No Data State */}
            {menuItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {menuItems.map((item) => (
                        <MenuCard
                            key={item._id}
                            id={item._id}
                            name={item.name}
                            price={item.price}
                            image={item.image}
                            isEnabled={item.isEnabled}
                            onToggle={handleToggle}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 mb-6">
                        <UtensilsCrossed size={48} className="text-slate-400"/>
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-600 dark:text-slate-300 mb-3">
                        No Menu Items Available
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                        Your menu is currently empty. Add some delicious items to get started with your restaurant menu.
                    </p>
                    <div
                        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            💡 Tip: Contact your administrator to add menu items
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Menu;