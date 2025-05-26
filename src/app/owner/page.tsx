'use client';

import React, {useState} from 'react';
import {
    Box,
    Home,
    TrendingUp,
    TrendingDown,
    Users,
    Settings,
    BarChart3,
    Plus, LayoutDashboard, UtensilsCrossed, Table2
} from "lucide-react";
import Header from "@/app/owner/components/Header";

const OwnerDashboard = () => {
    const [activeItem, setActiveItem] = useState('overview');
    const [selectedRestaurant, setSelectedRestaurant] = useState('pasta-place');
    const [showManagement, setShowManagement] = useState(false);

    const navItems = [
        {name: "Dashboard Overview", icon: BarChart3, id: "overview"},
        {name: "All Restaurants", icon: Box, id: "restaurants"},
        {name: "Staff Management", icon: Users, id: "staff"},
        {name: "Analytics & Reports", icon: TrendingUp, id: "analytics"},
        {name: "Platform Settings", icon: Settings, id: "settings"}
    ];

    const restaurants = [
        {
            id: 'pasta-place',
            name: '🍝 Pasta Place Downtown',
            revenue: '$2,450',
            orders: '12',
            occupancy: '85%',
            staff: '8/10'
        },
        {
            id: 'burger-barn',
            name: '🍔 Burger Barn Uptown',
            revenue: '$1,850',
            orders: '8',
            occupancy: '72%',
            staff: '6/8'
        },
        {
            id: 'sushi-spot',
            name: '🍣 Sushi Spot Mall',
            revenue: '$3,200',
            orders: '15',
            occupancy: '90%',
            staff: '10/12'
        }
    ];

    const selectedData = restaurants.find(r => r.id === selectedRestaurant);

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


                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">Select Restaurant</label>
                            <select
                                value={selectedRestaurant}
                                onChange={(e) => setSelectedRestaurant(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {restaurants.map(restaurant => (
                                    <option key={restaurant.id} value={restaurant.id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={"w-full mt-4 h-0.5 bg-slate-200"}></div>

                        <div className="flex mt-4 space-x-2">
                            <button
                                className="p-4 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75">
                                <LayoutDashboard/>
                                <p>Overview</p>
                            </button>
                            <button
                                className="p-4 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75">
                                <UtensilsCrossed/>
                                <p>Menu</p>
                            </button>
                            <button
                                className="p-4 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75">
                                <Table2/>
                                <p>Tables</p>
                            </button>
                            <button
                                className="p-4 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75">
                                <Users/>
                                <p>Staff</p>
                            </button>
                            <button
                                className="p-4 flex items-end justify-start gap-2 hover:bg-gray-100 rounded-xl transition-all duration-75">
                                <Settings/>
                                <p>Preferences</p>
                            </button>
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
                <div className="fixed mt-20 inset-y-0 w-80 bg-white border-r border-gray-200 h-full p-6 space-y-8">
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
                <div className="flex-1 ml-80 mt-22 p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
