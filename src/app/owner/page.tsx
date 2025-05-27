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
    Plus, LayoutDashboard, UtensilsCrossed, Table2, ChevronDown, Check
} from "lucide-react";
import Header from "@/app/owner/components/Header";
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from '@headlessui/react';
import api from "@/app/shared/lib/axios";
import {RestaurantOutput} from "@/app/shared/types/Restaurant";
import Overview from "@/app/owner/components/overview/Overview";
import {ResContext} from "@/app/owner/ResContext";
import Menu from "@/app/owner/components/menu/Menu";
import Tables from "@/app/owner/components/tables/Tables";


const OwnerDashboard = () => {
    const [activeItem, setActiveItem] = useState('overview');
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOutput | null>();
    const [showManagement, setShowManagement] = useState(false);
    const [restaurants, setRestaurants] = useState<RestaurantOutput[]>([]);
    const [selectedTab, setSelectedTab] = useState('overview');

    useEffect(() => {
        const fetchRestaurants = async () => {
            const response = await api.get("/api/owner");
            setRestaurants(response.data);
            setSelectedRestaurant(response.data[0]);
        }
        fetchRestaurants();
    }, [])

    const navItems = [
        {name: "Dashboard Overview", icon: BarChart3, id: "overview"},
        {name: "All Restaurants", icon: Box, id: "restaurants"},
        {name: "Staff Management", icon: Users, id: "staff"},
        {name: "Analytics & Reports", icon: TrendingUp, id: "analytics"},
        {name: "Platform Settings", icon: Settings, id: "settings"}
    ];

    // const restaurants = [
    //     {
    //         id: 'pasta-place',
    //         name: '🍝 Pasta Place Downtown',
    //         revenue: '$2,450',
    //         orders: '12',
    //         occupancy: '85%',
    //         staff: '8/10'
    //     },
    //     {
    //         id: 'burger-barn',
    //         name: '🍔 Burger Barn Uptown',
    //         revenue: '$1,850',
    //         orders: '8',
    //         occupancy: '72%',
    //         staff: '6/8'
    //     },
    //     {
    //         id: 'sushi-spot',
    //         name: '🍣 Sushi Spot Mall',
    //         revenue: '$3,200',
    //         orders: '15',
    //         occupancy: '90%',
    //         staff: '10/12'
    //     }
    // ];

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
                default:
                    return null;
            }
        }

    }

    const renderContent = () => {
        if (showManagement) {
            return (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Restaurant Management</h2>
                                <p className="text-gray-500">Select and manage your restaurant locations</p>
                            </div>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                <Plus size={16}/> Add Restaurant
                            </button>
                        </div>


                        <div className="space-y-2 w-full">
                            <Listbox value={selectedRestaurant} onChange={setSelectedRestaurant}>
                                <div className="relative">
                                    <ListboxButton
                                        className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <span className="block truncate text-md">
                                          {selectedRestaurant?.name || 'Select a restaurant'}
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

                        <div className="flex mt-4">
                            <button
                                onClick={() => setSelectedTab('overview')}
                                className={`px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 ${selectedTab === 'overview' ? 'underline underline-offset-12 decoration-blue-600 decoration-3' : 'decoration-0'}`}>
                                <LayoutDashboard/>
                                <p>Overview</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('menu')}
                                className={`px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 ${selectedTab === 'menu' ? 'underline underline-offset-12 decoration-blue-600 decoration-3' : 'decoration-0'}`}>
                                <UtensilsCrossed/>
                                <p>Menu</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('tables')}
                                className={`px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 ${selectedTab === 'tables' ? 'underline underline-offset-12 decoration-blue-600 decoration-3' : 'decoration-0'}`}>
                                <Table2/>
                                <p>Tables</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('staff')}
                                className={`px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 ${selectedTab === 'staff' ? 'underline underline-offset-12 decoration-blue-600 decoration-3' : 'decoration-0'}`}>
                                <Users/>
                                <p>Staff</p>
                            </button>
                            <button
                                onClick={() => setSelectedTab('preferences')}
                                className={`px-4 py-2 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75 ${selectedTab === 'preferences' ? 'underline underline-offset-12 decoration-blue-600 decoration-3' : 'decoration-0'}`}>
                                <Settings/>
                                <p>Preferences</p>
                            </button>
                        </div>
                        <div className={"bg-gray-50 rounded-lg p-4 mt-4"}>
                            {renderMainContent()}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-gray-600 text-lg">
                {/* Placeholder for Overview or other sections */}
                Select a quick action or use "Manage Restaurants".
            </div>
        );
    };

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Header */}
            <Header/>

            <div className="flex">
                {/* Sidebar */}
                <div className="fixed mt-20 inset-y-0 w-72 bg-white border-r border-gray-200 h-full p-6 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            <Home size={16}/> Restaurant Management
                        </h3>

                        <button
                            onClick={() => setShowManagement(true)}
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
                                        onClick={() => {
                                            setShowManagement(false);
                                            setActiveItem(item.id);
                                        }}
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
                </div>

                {/* Main Content */}
                <div className="flex-1 ml-72 mt-22 p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
