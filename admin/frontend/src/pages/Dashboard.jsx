import {useEffect, useState} from "react";
import {LogOut, Settings} from "lucide-react";
import Menu from "../components/Menu";
import OrderCard from "../components/OrderCard.jsx";
import Table from "../components/Table.jsx";
import Tables from "../components/Tables.jsx";
import Orders from "../components/Orders.jsx";
import Overview from "../components/Overview.jsx";

const Dashboard = () => {
    const [section, setSection] = useState("overview");

    const renderContent = () => {
        switch (section) {
            case "overview":
                return <Overview />;
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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">V-Menu Admin</h1>
                <button className="flex items-center text-sm text-red-500 hover:underline gap-2.5 cursor-pointer">
                    <Settings size={20} className="text-white"/>
                    <LogOut size={20}/>
                </button>
            </div>

            {/* Mobile nav */}
            <div className="flex justify-between bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl mb-4 text-sm font-medium flex-wrap sm:justify-center items-center">
                <button
                    onClick={() => setSection("overview")}
                    className={`flex-1 py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-100px ${
                        section === "overview"
                            ? "bg-blue-600 text-white"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                    }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setSection("tables")}
                    className={`flex-1 py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                        section === "tables"
                            ? "bg-blue-600 text-white"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                    }`}
                >
                    Tables
                </button>
                <button
                    onClick={() => setSection("orders")}
                    className={`flex-1 py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                        section === "orders"
                            ? "bg-blue-600 text-white"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                    }`}
                >
                    Orders
                </button>
                <button
                    onClick={() => setSection("menu")}
                    className={`flex-1 py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                        section === "menu"
                            ? "bg-blue-600 text-white"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                    }`}
                >
                    Menu
                </button>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-md">
                {renderContent()}
            </div>
        </div>
    );
};

export default Dashboard;
