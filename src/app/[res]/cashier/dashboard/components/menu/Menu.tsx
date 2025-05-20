'use client'

import {useEffect, useState} from "react";
import axios from "axios";
import MenuCard from "./MenuCard";
import SkeletonMenuCards from "../../../common/SkeletonMenuCard";
import {ItemOutput} from "@/app/shared/types/Item";
import {jwtDecode} from "jwt-decode";
import api from "@/app/shared/lib/axios";

const Menu = () => {
    const [menuItems, setMenuItems] = useState<ItemOutput[]>([]);
    const [loading, setLoading] = useState(true); // <--- track loading state

    useEffect(() => {
        async function fetchMenu() {
            try {
                const token = localStorage.getItem("token");
                const res = await api.get("/api/cashier/dashboard/menu");
                setMenuItems(res.data);
            } catch (err) {
                console.error("Error fetching menu:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchMenu();
    }, []);

    async function handleToggle(id: string) {
        const item = menuItems.find(item => item._id === id);
        let isEnabled = false;
        if (item) {
            isEnabled = true;
        }
        const res = await api.patch(`/api/cashier/dashboard/menu/${id}`, {isEnabled: isEnabled});

        setMenuItems((prev) =>
            prev.map((item) =>
                item._id === id ? {...item, isEnabled: !item.isEnabled} : item
            )
        );
    }

    return (
        <div className="menu w-full flex justify-center items-center">
            <div className="menu-card-wrapper w-full flex flex-wrap justify-center items-center max-w-[1024px]">
                {loading ? (
                    <div className={"flex flex-wrap items-center justify-center w-full"}>
                        <SkeletonMenuCards/>
                        <SkeletonMenuCards/>
                        <SkeletonMenuCards/>
                        <SkeletonMenuCards/>
                        <SkeletonMenuCards/>
                        <SkeletonMenuCards/>
                    </div>
                ) : menuItems.length > 0 ? (
                    menuItems.map((item) => (
                        <MenuCard
                            key={item._id}
                            id={item._id}
                            name={item.name}
                            price={item.price}
                            image={item.image}
                            isEnabled={item.isEnabled}
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
