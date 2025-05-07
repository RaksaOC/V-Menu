import { useEffect, useState } from "react";
import axios from "axios";
import SettingsMenuCard from "./SettingsMenuCard.jsx";
import EditItemPopup from "./EditItemPopup.jsx";

const SettingsMenu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await axios.get("http://localhost:3002/menu");
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchMenu();
    }, []); // Removed dependency on `menuItems` to avoid infinite loop

    return (
        <div className="menu w-full flex justify-center items-center">
            <div className="menu-card-wrapper w-full flex flex-wrap justify-center items-center max-w-[1024px] gap-2.5">
                {loading ? (
                    <h1>Loading menu...</h1>
                ) : menuItems.length > 0 ? (
                    menuItems.map((item) => (
                        <SettingsMenuCard
                            key={item._id}
                            id={item._id}
                            name={item.name}
                            price={item.price}
                            image={item.image}
                        />
                    ))
                ) : (
                    <h1>No Menu Items to display</h1>
                )}
            </div>
        </div>

    );
};

export default SettingsMenu;
