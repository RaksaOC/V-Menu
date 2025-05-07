import { useEffect, useState } from "react";
import axios from "axios";
import SettingsMenuCard from "./SettingsMenuCard.jsx";
import EditItemPopup from "./EditItemPopup.jsx";
import SkeletonMenuCards from "./SkeletonMenuCards.jsx";

const SettingsMenu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);

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
            <div className="menu-card-wrapper w-full flex flex-wrap justify-center items-center max-w-[1024px]">
                {loading ? (
                    <div className={"flex flex-wrap items-center justify-center w-full"}>
                        < SkeletonMenuCards> < /SkeletonMenuCards>
                    </div>
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
