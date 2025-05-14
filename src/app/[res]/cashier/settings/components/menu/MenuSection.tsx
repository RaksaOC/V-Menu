import AddItemPopup from "./AddItemPopup.jsx";
import Menu from "../dashboard/Menu.jsx";
import {useState} from "react";
import Menus from "./Menus.jsx";
import axios from "axios";

function MenuSection() {
    const [showAddItem, setShowAddItem] = useState(false);

    const handleOnClose = () => {
        setShowAddItem(false);
    }

    const handleOnSave = async (newItem) => {
        const response = await axios.post("http://localhost:3002/api/items", newItem, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
        console.log(response);
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
                <Menus/>
            </div>
            {
                showAddItem && <AddItemPopup onClose={handleOnClose} onSave={handleOnSave}></AddItemPopup>
            }
        </>
    );
}

export default MenuSection;