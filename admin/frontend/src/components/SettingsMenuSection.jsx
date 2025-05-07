import AddItemPopup from "./AddItemPopup.jsx";
import Menu from "./Menu.jsx";
import {useState} from "react";
import SettingsMenu from "./SettingsMenu.jsx";

function SettingsMenuSection() {
    const [showAddItem, setShowAddItem] = useState(false);

    const handleOnClose = () => {
        setShowAddItem(false);
    }

    const handleOnSave = () => {
        location.reload();
    }


    return (
        <>
            <div className="menu-wrapper max-w-[1024px] w-full flex flex-col items-center justify-center">
                <div className="flex items-center justify-between mb-4 w-full">
                    <h2 className="text-xl font-semibold">Menu Items</h2>
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors duration-200"
                        onClick={() => {
                            setShowAddItem(!showAddItem);
                        }}
                    >
                        + Add Item
                    </button>
                </div>
                <SettingsMenu/>
            </div>
            {
                showAddItem && <AddItemPopup onClose={handleOnClose} onSave={handleOnSave}></AddItemPopup>
            }
        </>
    );
}

export default SettingsMenuSection;