'use client';

import React, {createContext, Fragment, useEffect, useState} from 'react';
import {
    Box,
    Home,
    TrendingUp,
    TrendingDown,
    Users,
    Settings,
    BarChart3,
    Plus,
    LayoutDashboard,
    UtensilsCrossed,
    Table2,
    ChevronDown,
    Check
} from "lucide-react";
import Header from "@/app/owner/components/Header";
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from '@headlessui/react';
import api from "@/app/shared/lib/axios";
import {RestaurantOutput} from "@/app/shared/types/Restaurant";
import Overview from "@/app/owner/components/manageRestaurant/overview/Overview";
import {ResContext} from "@/app/owner/ResContext";
import Menu from "@/app/owner/components/manageRestaurant/menu/Menu";
import Tables from "@/app/owner/components/manageRestaurant/tables/Tables";
import Staff from '@/app/owner/components/manageRestaurant/staff/Staff';
import Preferences from '@/app/owner/components/manageRestaurant/preferences/Preferences';
import {AddRestaurantPopup} from "@/app/owner/AddRestaurantPopup";
import {Allan} from "next/dist/compiled/@next/font/dist/google";
import AllStaff from "@/app/owner/components/quickActions/staff/AllStaff";
import AllOverview from "@/app/owner/components/quickActions/overview/AllOverview";
import AllRestaurants from "@/app/owner/components/quickActions/allRestaurants/AllRestaurants";


const OwnerDashboard = () => {
    // temp fix for reloading res content when selected res changes
    const tabs = ["allRestaurants", "menu", "tables", "staff", "preferences"];

    const [activeItem, setActiveItem] = useState('management');
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOutput | null>();
    const [showManagement, setShowManagement] = useState(true);
    const [restaurants, setRestaurants] = useState<RestaurantOutput[]>([]);
    const [selectedTab, setSelectedTab] = useState('allRestaurants');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showAddRes, setShowAddRes] = useState(false);
    const [refresh, setRefresh] = useState(false);

    useEffect(() => {
        const savedTab = localStorage.getItem("activeTab");
        if (savedTab) {
            setActiveItem(savedTab);
        } else if (savedTab === "") {
            setActiveItem('management');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("activeTab", activeItem);
    }, [activeItem]);

    useEffect(() => {
        const fetchRestaurants = async () => {
            const response = await api.get("/api/owner/restaurants");
            setRestaurants(response.data);
            setSelectedRestaurant(response.data[0]);
        }
        fetchRestaurants();
    }, [refresh]);

    const handleAddRestaurant = async (name: string) => {
        try {
            const response = await api.post(`/api/owner/restaurants`, {name: name});
            console.log(response.data);
            setShowAddRes(false);
            setRefresh(prevState => !prevState);
            setSelectedRestaurant(response.data[response.data.length - 1]);
        } catch (error) {
            console.log(error);
        }
    }

    const handleManageRestaurant = (id: string) => {
        console.log("recieved click to manage wityh id ", id);
        setActiveItem('management');
        console.log(restaurants.find(restaurant => restaurant._id === id));
        setSelectedRestaurant(restaurants.find(restaurant => restaurant._id === id));
        setShowManagement(true);
        setSelectedTab('overview');
    }

    const navItems = [
        {name: "Dashboard Overview", icon: BarChart3, id: "overview"},
        {name: "All Restaurants", icon: Box, id: "restaurants"},
        {name: "Staff Management", icon: Users, id: "staff"}
        // {name: "Analytics & Reports", icon: TrendingUp, id: "analytics"},
        // {name: "Platform Settings", icon: Settings, id: "settings"}
    ];

    useEffect(() => {
        console.log("selected Restaurant changed", selectedRestaurant);
    }, [selectedRestaurant]);

    const renderMainContent = () => {
        if (selectedRestaurant) {
            switch (selectedTab) {
                case "overview":
                    return (
                        <ResContext.Provider value={selectedRestaurant.slug}>
                            <Overview></Overview>
                        </ResContext.Provider>
                    )
                case "menu":
                    return (
                        <ResContext.Provider value={selectedRestaurant.slug}>
                            <Menu></Menu>
                        </ResContext.Provider>
                    )
                case "tables":
                    return (
                        <ResContext.Provider value={selectedRestaurant.slug}>
                            <Tables></Tables>
                        </ResContext.Provider>
                    )
                case "staff":
                    return (
                        <ResContext.Provider value={selectedRestaurant.slug}>
                            <Staff></Staff>
                        </ResContext.Provider>
                    )
                case "preferences":
                    return (
                        <ResContext.Provider value={selectedRestaurant.slug}>
                            <Preferences></Preferences>
                        </ResContext.Provider>
                    )
                default:
                    return null;
            }
        }
    }

    const handleQuickAction = (itemId: string) => {
        setShowManagement(false);
        setActiveItem(itemId);
        setSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const handleManageRestaurants = () => {
        setShowManagement(true);
        setActiveItem('management');
        setSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const renderContent = () => {
        if (showManagement && activeItem === "management") {
            return (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
                        <div
                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Restaurant Management</h2>
                                <p className="text-gray-500 text-sm md:text-base">Select and manage your restaurant
                                    locations</p>
                            </div>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base w-full sm:w-auto justify-center"
                                onClick={() => setShowAddRes(true)}>
                                <Plus size={16}/> Add Restaurant
                            </button>
                        </div>

                        <div className="space-y-2 w-full">
                            <Listbox value={selectedRestaurant} onChange={(restaurant) => {
                                setSelectedRestaurant(restaurant);
                                setSelectedTab(tabs.find(t => t !== selectedTab) || "allRestaurants");
                            }}>
                                <div className="relative">
                                    <ListboxButton
                                        className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base">
                                        <span className="block truncate">
                                          {selectedRestaurant?.name || 'Select a restaurants'}
                                        </span>
                                        <span
                                            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                          <ChevronDown className="w-5 h-5 text-gray-400"/>
                                        </span>
                                    </ListboxButton>

                                    <ListboxOptions
                                        className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                                        {restaurants.map((restaurant) => (
                                            <ListboxOption key={restaurant._id} value={restaurant} as={Fragment}>
                                                {({selected, active}) => (
                                                    <li
                                                        className={`cursor-pointer select-none relative py-4 pl-10 pr-4 list-none ${
                                                            active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                                        }`}
                                                    >
                                                        <div className="flex gap-2.5 items-center">
                                                            <Home size={16}/>
                                                            <span
                                                                className={`block truncate ${selected ? 'font-semibold' : ''}`}>
                                                                {restaurant.name}
                                                            </span>
                                                        </div>
                                                        {selected && (
                                                            <span
                                                                className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                                <Check className="w-4 h-4"/>
                                                            </span>
                                                        )}
                                                    </li>
                                                )}
                                            </ListboxOption>
                                        ))}
                                    </ListboxOptions>
                                </div>
                            </Listbox>
                        </div>

                        <div className={"w-full mt-4 h-0.5 bg-slate-200"}></div>

                        {/* Tab Navigation - Made responsive */}
                        <div className="flex flex-wrap mt-4 gap-1">
                            <button
                                onClick={() => setSelectedTab('overview')}
                                className={`px-3 md:px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 text-sm md:text-base ${selectedTab === 'allRestaurants' ? 'underline underline-offset-8 md:underline-offset-12 decoration-blue-600 decoration-2 md:decoration-3' : 'decoration-0'}`}>
                                <LayoutDashboard size={16} className="md:w-5 md:h-5"/>
                                <p>Overview</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('menu')}
                                className={`px-3 md:px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 text-sm md:text-base ${selectedTab === 'menu' ? 'underline underline-offset-8 md:underline-offset-12 decoration-blue-600 decoration-2 md:decoration-3' : 'decoration-0'}`}>
                                <UtensilsCrossed size={16} className="md:w-5 md:h-5"/>
                                <p>Menu</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('tables')}
                                className={`px-3 md:px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 text-sm md:text-base ${selectedTab === 'tables' ? 'underline underline-offset-8 md:underline-offset-12 decoration-blue-600 decoration-2 md:decoration-3' : 'decoration-0'}`}>
                                <Table2 size={16} className="md:w-5 md:h-5"/>
                                <p>Tables</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('staff')}
                                className={`px-3 md:px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 text-sm md:text-base ${selectedTab === 'staff' ? 'underline underline-offset-8 md:underline-offset-12 decoration-blue-600 decoration-2 md:decoration-3' : 'decoration-0'}`}>
                                <Users size={16} className="md:w-5 md:h-5"/>
                                <p>Staff</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('preferences')}
                                className={`px-3 md:px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 text-sm md:text-base ${selectedTab === 'preferences' ? 'underline underline-offset-8 md:underline-offset-12 decoration-blue-600 decoration-2 md:decoration-3' : 'decoration-0'}`}>
                                <Settings size={16} className="md:w-5 md:h-5"/>
                                <p>Preferences</p>
                            </button>
                        </div>
                        <div className={"bg-gray-50 rounded-lg p-6 mt-4"}>
                            {renderMainContent()}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
                    {
                        activeItem === "overview" && (<AllOverview/>)
                    }
                    {
                        activeItem === "restaurants" && (<AllRestaurants onManage={handleManageRestaurant}/>)
                    }
                    {
                        activeItem === "staff" && (<AllStaff/>)
                    }
                </div>
            </div>
        );
    };

    // Sidebar content to pass to Header
    const sidebarContent = (
        <>
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <Home size={16}/> Restaurant Management
                </h3>

                <button
                    onClick={handleManageRestaurants}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                    <Home size={18}/> Manage Restaurants
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">⚡
                    Quick Actions</h3>

                <div className="space-y-1">
                    {navItems.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <button
                                key={index}
                                onClick={() => handleQuickAction(item.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeItem === item.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <Icon size={18}/> {item.name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Header with integrated mobile sidebar */}
            <Header
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarContent={sidebarContent}
                userInfo={{name: "John Doe", role: "Owner"}}
            />

            <div className="flex">
                {/* Desktop Sidebar */}
                <div
                    className="hidden lg:block fixed mt-20 inset-y-0 w-72 bg-white border-r border-gray-200 h-full p-6 space-y-8">
                    {sidebarContent}
                </div>

                <div className="flex-1 pt-24 lg:pt-26 pr-2 lg:pr-4 pl-2 lg:pl-76">
                    {renderContent()}
                </div>
            </div>
            {
                showAddRes && <AddRestaurantPopup onClose={() => setShowAddRes(false)} onSave={handleAddRestaurant}/>
            }
        </div>
    );

};

export default OwnerDashboard;