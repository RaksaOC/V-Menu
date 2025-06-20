import React, {useContext, useEffect, useState} from "react";
import MenuCard from "./MenuCard";
import SkeletonMenuCard from "@/app/[res]/common/SkeletonMenuCard";
import {ItemInput, ItemOutput} from "@/app/shared/types/Item";
import api from "@/app/shared/lib/axios";
import {ResContext} from "@/app/owner/ResContext";
import {Plus, TrendingUp, UtensilsCrossed} from "lucide-react";
import AddItemPopup from "@/app/owner/components/manageRestaurant/menu/AddItemPopup";

const Menu = () => {
    const [menuItems, setMenuItems] = useState<ItemOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const resSlug = useContext(ResContext);
    const [showAddItems, setShowAddItems] = useState(false);
    const [refresh, setRefresh] = useState(false);

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await api.get(`/api/owner/${resSlug}/menu`);
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchMenu();
    }, [refresh]);

    const handleOnSave = async (newItem: ItemInput) => {
        try {
            const response = await api.post(`/api/owner/${resSlug}/menu`, newItem);
            setRefresh(prev => !prev);
            setShowAddItems(false);
        } catch (err) {
            console.log(err);
        }
    }

    return (
        <>
            <div className="menu w-full flex flex-col justify-center items-center">
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    {loading ? (
                        <div className="w-full flex justify-between items-center animate-pulse">
                            <div>
                                <div className="h-6 bg-slate-200 rounded w-32 mb-2"/>
                                <div className="h-4 bg-slate-200 rounded w-40"/>
                            </div>
                            <div className="h-10 w-16 bg-slate-200 rounded-lg"/>
                        </div>
                    ) : (
                        <>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                                    Manage Menu
                                </h2>
                                <p className="text-gray-600 text-sm">
                                    Create, Edit menu items
                                </p>
                            </div>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                onClick={() => setShowAddItems(!showAddItems)}>
                                <Plus size={16}/> Add Item
                            </button>
                        </>
                    )}
                </div>
                {

                }

                {/* Menu Content */}
                <div className="menu-card-wrapper w-full max-w-full flex flex-wrap justify-center items-center mt-8">
                    {
                        loading ? (
                                <div className="mt-4 w-full">
                                    <SkeletonMenuCard isLight={true}/>
                                </div>
                            ) :
                            menuItems.length > 0 ? (
                                <div
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full ">
                                    {menuItems.map((item) => (
                                        <MenuCard
                                            key={item._id}
                                            id={item._id}
                                            name={item.name}
                                            price={item.price}
                                            image={item.image}
                                            isEnabled={item.isEnabled}
                                            onModified={() => {
                                                setRefresh(prev => !prev);
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="bg-slate-100  rounded-full p-6 mb-6">
                                        <UtensilsCrossed size={48} className="text-black"/>
                                    </div>
                                    <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                                        No Menu Items Available
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                                        Your menu is currently empty. Add some delicious items to get started with your
                                        restaurant menu.
                                    </p>
                                </div>
                            )}
                </div>
            </div>
            {showAddItems && (<AddItemPopup onClose={() => setShowAddItems(false)} onSave={handleOnSave}/>)}
        </>
    );
};

export default Menu;
