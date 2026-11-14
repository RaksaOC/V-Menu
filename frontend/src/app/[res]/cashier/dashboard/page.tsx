'use client';

import {ReactNode, useEffect, useState} from "react";
import Menu from "./components/menu/Menu";
import Tables from "./components/tables/Tables";
import Orders from "./components/orders/Orders";
import Overview from "./components/overview/Overview";
import Header from "./components/Header";
import {BarChart3, UtensilsCrossed, Users, ShoppingBag, ChevronRight} from "lucide-react";

const Dashboard = () => {
    const savedSection = localStorage.getItem("dashboardSection") || "overview";
    const [section, setSection] = useState(savedSection);

    useEffect(() => {
        if (!savedSection) {
            setSection("overview");
        } else {
            setSection(savedSection);
        }
    }, [])

    useEffect(() => {
        localStorage.setItem("dashboardSection", section);
    }, [section])

    const navigationItems = [
        {
            id: "overview",
            label: "Overview",
            icon: BarChart3,
            description: "Dashboard analytics"
        },
        {
            id: "tables",
            label: "Tables",
            icon: Users,
            description: "Manage seating"
        },
        {
            id: "orders",
            label: "Orders",
            icon: ShoppingBag,
            description: "Order management"
        },
        {
            id: "menu",
            label: "Menu",
            icon: UtensilsCrossed,
            description: "Menu items"
        }
    ];

    const handleSectionChange = (sectionId: string) => {
        setSection(sectionId);
        localStorage.setItem("dashboardSection", sectionId);
    };

    const renderContent = () => {
        switch (section) {
            case "overview":
                return <Overview/>;
            case "orders":
                return <Orders/>
            case "menu":
                return <Menu/>;
            case "tables":
                return <Tables/>
            default:
                return null;
        }
    };

    const currentSection = navigationItems.find(item => item.id === section);

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
            <Header/>

            <div className="flex relative">
                {/* Sidebar Navigation */}
                <div
                    className="w-72 hidden md:block bg-white fixed left-0 dark:bg-slate-800 min-h-[calc(100vh-88px)] border-r border-slate-200 dark:border-slate-700 p-6">
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Dashboard</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your restaurant operations</p>
                    </div>

                    <nav className="space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = section === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSectionChange(item.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group ${
                                        isActive
                                            ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${
                                            isActive
                                                ? "bg-blue-100 dark:bg-blue-900/30"
                                                : "bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600"
                                        }`}>
                                            <Icon size={20}
                                                  className={isActive ? "text-blue-600 dark:text-blue-400" : ""}/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">{item.label}</div>
                                            <div className={`text-xs ${
                                                isActive
                                                    ? "text-blue-600 dark:text-blue-400"
                                                    : "text-slate-400 dark:text-slate-500"
                                            }`}>
                                                {item.description}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className={`transition-transform ${
                                        isActive ? "rotate-90" : "group-hover:translate-x-1"
                                    }`}/>
                                </button>
                            );
                        })}
                    </nav>
                </div>
                <div
                    className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around items-center py-2 md:hidden">
                    {navigationItems.map(item => {
                        const Icon = item.icon;
                        const isActive = section === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleSectionChange(item.id)}
                                className={`flex flex-col items-center text-xs ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}
                            >
                                <Icon size={20}/>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 md:pl-80 md:pr-8 md:py-4 p-4 pb-24 md:pb-0">
                    {/* Content Header */}
                    <div className="mb-6">
                        <div className="flex items-center space-x-3 mb-2">
                            {currentSection && (
                                <>
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                        <currentSection.icon size={20} className="text-white"/>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                                            {currentSection.label}
                                        </h1>
                                        <p className="text-slate-500 dark:text-slate-400">
                                            {currentSection.description}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[600px]">
                        <div className="p-6">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;