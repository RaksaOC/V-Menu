'use client';

import {useEffect, useState, useRef} from "react";
import Card from "./Card";
import {OrderOutput} from "@/app/shared/types/Order";
import axios from "axios";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
import {useParams} from "next/navigation";

export default function KitchenPage() {
    const params = useParams();
    const [orders, setOrders] = useState<OrderOutput[]>([]);
    const previousOrderIdsRef = useRef<string[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get(`/api/kitchen/${params.res}`);
                const activeOrders = response.data.filter((order: OrderOutput) => !order.isDone);
                setOrders(activeOrders);
                previousOrderIdsRef.current = activeOrders.map((order: OrderOutput) => order._id);
            } catch (err) {
                console.error("Initial fetch error:", err);
            }
        };

        fetchOrders();

        const intervalId = setInterval(async () => {
            try {
                const response = await axios.get(`/api/kitchen/${params.res}`);
                const activeOrders = response.data.filter((order: OrderOutput) => !order.isDone);

                const newOrders = activeOrders.filter((order: OrderOutput) => !previousOrderIdsRef.current.includes(order._id));
                if (newOrders.length > 0) {
                    toast.info("New order received!", {
                        position: "top-center",
                        autoClose: 1000,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: false,
                        draggable: false,
                        theme: "light",
                    });
                }

                setOrders(activeOrders);
                previousOrderIdsRef.current = activeOrders.map((order: OrderOutput) => order._id);
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 2000);

        return () => clearInterval(intervalId);
    }, []);

    const handleOnDone = async (id: string) => {
        try {
            await axios.patch(`/api/kitchen/${params.res}/${id}`);
            setOrders(prev => prev.filter(order => order._id !== id));
            toast.success("Order marked as done!", {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: false,
                theme: "light",
            });
        } catch (err) {
            console.error("Failed to mark order as done:", err);
        }
    };

    return (
        <div className="w-full min-h-screen bg-white">
            <ToastContainer/>
            <header className="header p-2.5 w-full flex items-center justify-center">
                <div className={"max-w-[1024px] w-full"}>
                    <p className="text-center text-black text-3xl">V-Menu Kitchen</p>
                </div>
            </header>
            <div className={"back-button-wrapper flex w-full justify-center"}>
                <div className="back-button flex justify-end w-full p-4 max-w-[1024px]">
                    <Link href={`/${params.res}/kitchen/history`}>
                        <button
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer">
                            View Order History
                        </button>
                    </Link>
                </div>
            </div>

            <div className="chef-card-wrapper flex flex-col justify-center items-center">
                {orders.length > 0 ? (
                    orders.map((order) => (
                        <Card
                            key={order._id}
                            orderId={order._id}
                            table={order.table}
                            orderedItems={order.orderedItems}
                            onDone={handleOnDone}
                            isDone={order.isDone}
                        />
                    ))
                ) : (
                    <h1 className="mt-[50vh] text-4xl text-center">No Orders To Display</h1>
                )}
            </div>
        </div>
    );
}
