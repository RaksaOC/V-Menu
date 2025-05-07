import {useEffect, useState} from "react";
import axios from "axios";
import MenuCard from "./MenuCard.jsx";
import SkeletonMenuCards from "./SkeletonMenuCards.jsx";

const Menu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true); // <--- track loading state

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await axios.get("http://localhost:3002/menu");
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false); // <--- stop loading no matter what
            }
        }

        fetchMenu();
    }, [menuItems]);

    async function handleToggle(id) {
        const itemToUpdate = menuItems.find((item) => item._id === id);
        const res = await axios.put("http://localhost:3002/menu", itemToUpdate);
        console.log("response from update: ", res.data);
        // optionally update the UI immediately
        setMenuItems((prev) =>
            prev.map((item) =>
                item._id === id ? {...item, isAvailable: !item.isAvailable} : item
            )
        );
    }

    return (
        <div className="menu flex justify-center items-center">
            <div className="menu-card-wrapper w-full flex flex-wrap justify-center items-center max-w-[1024px]">
                {loading ? (
                    <div className={"flex flex-wrap items-center justify-center w-full"}>
                        < SkeletonMenuCards> < /SkeletonMenuCards>
                    </div>
                ) : menuItems.length > 0 ? (
                    menuItems.map((item) => (
                        <MenuCard
                            key={item._id}
                            id={item._id}
                            name={item.name}
                            price={item.price}
                            image={item.image}
                            isAvailable={item.isAvailable}
                            onToggle={handleToggle}
                        />
                    ))
                ) : (
                    <h1>No Menu Items to display</h1>
                )}
            </div>
        </div>
    );
};

export default Menu;
