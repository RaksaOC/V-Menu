import {useEffect, useState} from "react";
import axios from "axios";
import MenuCard from "./MenuCard.jsx";
import SkeletonMenuCards from "../common/skeleton/SkeletonMenuCard.jsx";

const Menu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true); // <--- track loading state

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await axios.get("http://localhost:3002/api/items", {
                    headers: {
                        Authorization: `${localStorage.getItem("token")}`,
                    }
                });
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false); // <--- stop loading no matter what
            }
        }

        fetchMenu();
    }, []);

    async function handleToggle(id) {
        const isEnabled = menuItems.find(item => item._id === id).isEnabled;
        const res = await axios.patch(`http://localhost:3002/api/items/${id}/availability`, {isEnabled: isEnabled}, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
        console.log("response from update: ", res.data);

        // TODO: fix where server error it wont update UI (the button)

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
                    <div className={"w-full h-96 flex justify-center items-center"}>
                        <h1 className={"text-3xl text-center"}>No Menu to display</h1>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Menu;
