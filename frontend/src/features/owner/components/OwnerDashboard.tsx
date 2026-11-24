"use client";

import React, { useEffect, useState } from "react";
import type { Restaurant } from "@vmenu/contracts";
import DashboardHeader from "@/components/layout/DashboardHeader";
import MobileSidebar from "@/components/layout/MobileSidebar";
import { MoneyProvider, sharedMoney } from "@/components/money/MoneyProvider";
import { ToastHost } from "@/components/ui";
import { createRestaurant, getRestaurants } from "@/features/owner/api";
import { AddRestaurantPopup } from "@/features/owner/components/AddRestaurantPopup";
import AllOverview from "@/features/owner/components/AllOverview";
import AllRestaurants from "@/features/owner/components/AllRestaurants";
import AllStaff from "@/features/staff/components/AllStaff";
import { useMe } from "@/lib/use-me";
import { OwnerSidebar } from "./dashboard/OwnerSidebar";
import { RestaurantManagement } from "./dashboard/RestaurantManagement";
import type { RestaurantTab } from "./dashboard/RestaurantTabs";

/** The owner's page: one restaurant's tabs ("management"), or a view across all of them. */
const OwnerDashboard = () => {
    const me = useMe(); // VM-20
    const [activeItem, setActiveItem] = useState("management");
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [showManagement, setShowManagement] = useState(true);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedTab, setSelectedTab] = useState<RestaurantTab>("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showAddRes, setShowAddRes] = useState(false);
    const [refresh, setRefresh] = useState(false);

    useEffect(() => {
        const savedTab = localStorage.getItem("activeTab");
        if (savedTab) {
            setActiveItem(savedTab);
        } else if (savedTab === "") {
            setActiveItem("management");
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("activeTab", activeItem);
    }, [activeItem]);

    useEffect(() => {
        const fetchRestaurants = async () => {
            const restaurants = await getRestaurants();
            setRestaurants(restaurants);
            setSelectedRestaurant(restaurants[0]);
        };
        fetchRestaurants();
    }, [refresh]);

    const handleAddRestaurant = async (name: string) => {
        try {
            const restaurants = await createRestaurant(name);
            setShowAddRes(false);
            setRefresh((prevState) => !prevState);
            setSelectedRestaurant(restaurants[restaurants.length - 1]);
        } catch (error) {
            console.error(error);
        }
    };

    const handleManageRestaurant = (id: string) => {
        setActiveItem("management");
        setSelectedRestaurant(restaurants.find((restaurant) => restaurant._id === id) ?? null);
        setShowManagement(true);
        setSelectedTab("overview");
    };

    const handleQuickAction = (itemId: string) => {
        setShowManagement(false);
        setActiveItem(itemId);
        setSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const handleManageRestaurants = () => {
        setShowManagement(true);
        setActiveItem("management");
        setSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const content =
        showManagement && activeItem === "management" ? (
            <RestaurantManagement
                restaurants={restaurants}
                selected={selectedRestaurant}
                onSelect={setSelectedRestaurant}
                tab={selectedTab}
                onTab={setSelectedTab}
                onAdd={() => setShowAddRes(true)}
                onSettingsSaved={(settings) =>
                    setRestaurants((all) => all.map((r) => (r._id === selectedRestaurant?._id ? { ...r, settings } : r)))
                }
            />
        ) : (
            <div className="space-y-6">
                <div className="bg-[var(--bg)] rounded-xl p-4 md:p-6 border border-[var(--line)]">
                    {/* VM-24: totals across restaurants use their currency when they all share one */}
                    <MoneyProvider settings={sharedMoney(restaurants)}>
                        {activeItem === "overview" && <AllOverview />}
                        {activeItem === "restaurants" && <AllRestaurants onManage={handleManageRestaurant} />}
                        {activeItem === "staff" && <AllStaff />}
                    </MoneyProvider>
                </div>
            </div>
        );

    const sidebar = <OwnerSidebar activeItem={activeItem} onManage={handleManageRestaurants} onQuickAction={handleQuickAction} />;

    return (
        <div className="w-full min-h-screen bg-[var(--card)]">
            <ToastHost />
            <DashboardHeader
                title="V-Menu Owner"
                subtitle="Manage your restaurants"
                roleLabel="Owner"
                name={me?.name}
                email={me?.email}
                loginHref="/owner/login"
                position="fixed"
                onOpenMenu={() => setSidebarOpen(true)}
            />
            <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={{ name: me?.name ?? "", role: "Owner" }}>
                {sidebar}
            </MobileSidebar>

            <div className="flex">
                <div className="hidden lg:block fixed mt-20 inset-y-0 w-72 bg-[var(--bg)] border-r border-[var(--line)] h-full p-6 space-y-8">
                    {sidebar}
                </div>

                <div className="flex-1 min-w-0 pt-24 lg:pt-26 pr-2 lg:pr-4 pl-2 lg:pl-76">{content}</div>
            </div>
            {showAddRes && <AddRestaurantPopup onClose={() => setShowAddRes(false)} onSave={handleAddRestaurant} />}
        </div>
    );
};

export default OwnerDashboard;
