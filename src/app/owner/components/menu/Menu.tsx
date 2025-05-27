import React, {useContext, useEffect, useState} from "react";
import MenuCard from "./MenuCard";
import SkeletonMenuCard from "@/app/[res]/common/SkeletonMenuCard";
import {ItemOutput} from "@/app/shared/types/Item";
import api from "@/app/shared/lib/axios";
import {ResContext} from "@/app/owner/ResContext";
import {Plus, TrendingUp} from "lucide-react";
import AddItemPopup from "@/app/owner/components/menu/AddItemPopup";

const Menu = () => {
    const [menuItems, setMenuItems] = useState<ItemOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const resSlug = useContext(ResContext);
    const [showAddItems, setShowAddItems] = useState(false);

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
    }, []);

    function handleAddItem() {

    }

    return (
        <>
            <div className="menu w-full flex flex-col justify-center items-center">
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    {loading ? (
                        <div className="w-full flex justify-between items-center animate-pulse">
                            <div>
                                <div className="h-6 bg-slate-200 rounded w-40 mb-2"/>
                                <div className="h-4 bg-slate-200 rounded w-60"/>
                            </div>
                            <div className="h-10 w-28 bg-slate-200 rounded-lg"/>
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

                {/* Menu Content */}
                <div className="menu-card-wrapper w-full flex flex-wrap justify-center items-center mt-8">
                    {loading ? (
                        <SkeletonMenuCard isLight={true}/>
                    ) : menuItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                            {menuItems.map((item) => (
                                <MenuCard
                                    key={item._id}
                                    id={item._id}
                                    name={item.name}
                                    price={item.price}
                                    image={item.image}
                                    isEnabled={item.isEnabled}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                            <div className="bg-gray-100  rounded-full p-4 mb-4">
                                <TrendingUp size={32} className="text-gray-400"/>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-600  mb-2">
                                No Data Available
                            </h3>
                            <p className="text-gray-500 ">
                                Overview statistics will appear here once data is available.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {showAddItems && (<AddItemPopup onClose={() => setShowAddItems(false)} onSave={() => handleAddItem}/>)}
        </>
    );
};

export default Menu;
