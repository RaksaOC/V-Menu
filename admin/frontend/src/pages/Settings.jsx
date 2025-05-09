import {useEffect, useState} from "react";
import {ArrowLeft} from "lucide-react";
import {useLocation, useNavigate} from "react-router";
import SettingsMenuSection from "../components/SettingsMenuSection.jsx";
import SettingsTablesSection from "../components/SettingsTablesSection.jsx";

const Settings = () => {
    const location = useLocation();
    const [section, setSection] = useState("");
    useEffect(() => {
        if (location.state?.section) {
            setSection(location.state.section);
            window.history.replaceState({}, document.title); // clears location.state
        } else {
            const saved = localStorage.getItem("settingSection");
            if (saved) {
                setSection(saved);
            }
        }
    }, []);

    const navigate = useNavigate();

    // Persist to localStorage without JSON.stringify
    useEffect(() => {
        localStorage.setItem("settingSection", section);
    }, [section]);

    const renderContent = () => {
        switch (section) {
            case "preferences":
                return <div className="p-4"><h1 className="text-3xl m-48">Coming Soon</h1></div>;
            case "menus":
                return <SettingsMenuSection/>;
            case "tables":
                return <SettingsTablesSection/>;
            default:
                return null;
        }
    };

    return (
        <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white p-4">
            {/* Go Back */}
            <div className="back-div w-full flex justify-start items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors duration-200 flex justify-between items-center mb-4"
                >
                    <ArrowLeft className="mr-2" size={18}/>
                    Go Back
                </button>
            </div>

            {/* Tabs */}
            <div
                className="nav flex justify-center bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl mb-4 text-sm font-medium flex-wrap sm:justify-center items-center">
                <div className="nav-wrapper max-w-[1024px] flex justify-between h-full w-full flex-wrap gap-1">
                    {["menus", "tables", "preferences"].map((key) => (
                        <button
                            key={key}
                            onClick={() => setSection(key)}
                            className={`flex-1 py-2 rounded-xl cursor-pointer transition-colors duration-200 min-w-[100px] m-1 ${
                                section === key
                                    ? "bg-blue-600 text-white"
                                    : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-700/50"
                            }`}
                        >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Section Content */}
            <div
                className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-md flex flex-col items-center justify-center">
                {renderContent()}
            </div>
        </div>
    );
};

export default Settings;
