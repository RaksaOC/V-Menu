import { useEffect, useState } from "react";
import axios from "axios";
import MenuCard from "./MenuCard.jsx";

const Menu = () => {
    const [menuItems, setMenuItems] = useState([]);

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await axios.get("http://localhost:3002/menu");
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            }
        }

        fetchMenu();
    }, []);

    async function handleToggle(id) {
        const itemToUpdate = menuItems.find((item) => item._id === id);
        itemToUpdate.isAvailable = !itemToUpdate.isAvailable;
        const res = await axios.put("http://localhost:3002/menu", itemToUpdate);
        console.log("responce from update: ", res.data);
    }

    return (
        <div className="menu flex  justify-center items-center">
            <div className={"menu-card-wrapper w-full flex flex-wrap justify-center items-center max-w-[1024px]"}>
                {menuItems.length > 0 ? (
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
                    setTimeout(() => {
                        return <h1>No Menu Items to display</h1>
                    }, 2000)
                )}
            </div>
        </div>
    );
};

export default Menu;
