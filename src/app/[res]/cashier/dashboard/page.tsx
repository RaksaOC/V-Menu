'use client';

import {ReactNode, useEffect, useState} from "react";
import Menu from "./components/menu/Menu";
import Tables from "./components/tables/Tables";
import Orders from "./components/orders/Orders";
import Overview from "./components/overview/Overview";
import Header from "./components/Header";

const Dashboard = () => {
    const savedSection = localStorage.getItem("dashboardSection");
    const [section, setSection] = useState("");

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

    return (
        <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white p-4">
            <Header/>
            {/* Mobile nav */}
            <div
                className="nav flex justify-center bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl mb-4 text-sm font-medium flex-wrap sm:justify-center items-center">
                <div className={"nav-wrapper max-w-[1024px] flex justify-between h-full w-full flex-wrap gap-1"}>
                    <button
                        onClick={() => {
                            setSection("overview")
                            localStorage.setItem("dashboardSection", "overview");
                        }}
                        className={`basis-[45%] sm:basis-[22%] grow py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                            section === "overview"
                                ? "bg-blue-600 text-white"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                        }`}

                    >
                        Overview
                    </button>
                    <button
                        onClick={() => {
                            setSection("tables")
                            localStorage.setItem("dashboardSection", "tables");
                        }}
                        className={`basis-[45%] sm:basis-[22%] grow py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                            section === "tables"
                                ? "bg-blue-600 text-white"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                        }`}

                    >
                        Tables
                    </button>
                    <button
                        onClick={() => {
                            setSection("orders")
                            localStorage.setItem("dashboardSection", "orders");
                        }}
                        className={`basis-[45%] sm:basis-[22%] grow py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                            section === "orders"
                                ? "bg-blue-600 text-white"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                        }`}

                    >
                        Orders
                    </button>
                    <button
                        onClick={() => {
                            setSection("menu")
                            localStorage.setItem("dashboardSection", "menu");
                        }}
                        className={`basis-[45%] sm:basis-[22%] grow py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                            section === "menu"
                                ? "bg-blue-600 text-white"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                        }`}

                    >
                        Menu
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-md flex justify-center items-center">
                <div className={"content-wrapper w-full flex justify-center items-center max-w-[1024px]"}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
