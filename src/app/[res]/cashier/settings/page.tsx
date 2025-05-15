'use client';

import {ReactNode, useEffect, useState} from "react";
import MenuSection from "./components/menu/MenuSection";
import TablesSection from "./components/tables/TablesSection";
import Preferences from "./components/preferences/Preferences";
import {ArrowLeft} from "lucide-react";
import {useRouter} from "next/navigation";

const Dashboard = () => {
    const savedSection = localStorage.getItem("settingsSection");
    const [section, setSection] = useState("menu");
    const router = useRouter();

    useEffect(() => {
        if (!savedSection) {
            setSection("menu");
        } else {
            setSection(savedSection);
        }
    }, [])

    useEffect(() => {
        localStorage.setItem("settingsSection", section);
    }, [section])

    const renderContent = () => {
        switch (section) {
            case "menu":
                return <MenuSection/>;
            case "tables":
                return <TablesSection/>
            case "preferences":
                // @ts-ignore
                return <Preferences/>
            default:
                return null;
        }
    };

    return (
        <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white p-4">
            <div className={"back w-full flex justify-center items-center pb-3.5"}>
                <div className={"back-wrapper max-w-[1024px] w-full flex"}>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition" onClick={() => router.back()}>
                        <ArrowLeft size={18} />
                        Dashboard
                    </button>
                </div>
            </div>
            <div
                className="nav flex justify-center bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl mb-4 text-sm font-medium flex-wrap sm:justify-center items-center">
                <div className={"nav-wrapper max-w-[1024px] flex justify-between h-full w-full flex-wrap gap-1"}>
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
                        onClick={() => setSection("preferences")}
                        className={`flex-1 py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                            section === "preferences"
                                ? "bg-blue-600 text-white"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                        }`}
                    >
                        Preferences
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-md flex justify-center items-center">
                <div className={"content-wrapper flex justify-center items-center max-w-[1024px]"}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
