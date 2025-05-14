import { useEffect, useState } from "react";
import axios from "axios";
import MenuCard from "./MenuCard";
import SkeletonMenuCard from "../../../common/SkeletonMenuCard";
import {ItemOutput} from "@/app/shared/types/Item";

const Menu = () => {
    const [menuItems, setMenuItems] = useState<ItemOutput[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMenu() {
            try {
                const res = await axios.get("/api/cashier/settings/menu");
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchMenu();
    }, []);

    return (
        <div className="menu w-full flex justify-center items-center">
            <div className="menu-card-wrapper w-full flex flex-wrap justify-center items-center max-w-[1024px] ">
                {loading ? (
                    <div className={"flex flex-wrap items-center justify-center w-full"}>
                        <SkeletonMenuCard></SkeletonMenuCard>
                        <SkeletonMenuCard></SkeletonMenuCard>
                        <SkeletonMenuCard></SkeletonMenuCard>
                    </div>
                ) : menuItems.length > 0 ? (
                    menuItems.map((item) => (
                        <MenuCard
                            key={item._id}
                            id={item._id}
                            name={item.name}
                            price={item.price}
                            image={item.image}
                        />
                    ))
                ) : (
                    <div className={"w-full h-96 flex justify-center items-center"}>
                        <h1 className={"text-3xl text-center"}>No Menu to Display</h1>
                    </div>
                )}
            </div>
        </div>

    );
};

export default Menu;
