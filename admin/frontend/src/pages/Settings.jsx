import {useEffect, useState} from "react";
import {ArrowLeft} from "lucide-react";
import {useLocation, useNavigate} from "react-router";
import Menu from "../components/Menu";
import Tables from "../components/Tables.jsx";
import AddItemPopup from "../components/AddItemPopup.jsx";
import SettingsMenu from "../components/SettingsMenu.jsx";
import SettingsTables from "../components/SettingsTables.jsx";

const Settings = () => {
    const location = useLocation();
    const initialSection = location.state?.section || "menus";
    const [section, setSection] = useState(initialSection);
    const navigate = useNavigate();


    const renderContent = () => {
        switch (section) {
            case "preferences":
                return <div className="p-4">Preference Management Placeholder</div>;
            case "menus":
                return <SettingsMenu></SettingsMenu>
            case "tables":
                return <SettingsTables></SettingsTables>
            default:
                return null;
        }
    };

    return (
        <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white p-4">
            {/* Go Back */}
            <button
                onClick={() => navigate(-1)}
                className="mb-4 flex items-center text-blue-600 hover:underline"
            >
                <ArrowLeft className="mr-2" size={18}/>
                Go Back
            </button>

            {/* Tabs */}
            <div
                className="nav flex justify-center bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl mb-4 text-sm font-medium flex-wrap sm:justify-center items-center">
                <div className="nav-wrapper max-w-[1024px] flex justify-between h-full w-full flex-wrap gap-1">
                    <button
                        onClick={() => setSection("menus")}
                        className={`flex-1 py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                            section === "menus"
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
                        Table
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

            {/* Section Content */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-md flex flex-col items-center justify-center">
                {renderContent()}
            </div>
        </div>
    );
};

export default Settings;
