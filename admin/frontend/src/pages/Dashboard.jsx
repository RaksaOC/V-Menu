import {useEffect, useState} from "react";
import {LogOut, Settings} from "lucide-react";
import Menu from "../components/Menu";
import OrderCard from "../components/OrderCard.jsx";
import Table from "../components/Table.jsx";
import Tables from "../components/Tables.jsx";
import Orders from "../components/Orders.jsx";
import Overview from "../components/Overview.jsx";
import Header from "../components/Header.jsx";
import SettingsPage from "../pages/Settings.jsx";

const Dashboard = () => {
    const [section, setSection] = useState("overview");

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
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-md">
                {renderContent()}
            </div>
        </div>
    );
};

export default Dashboard;
