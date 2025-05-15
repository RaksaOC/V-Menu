'use client'

import Card from "@/app/[res]/kitchen/Card";
import {useEffect, useState} from "react";
import {OrderOutput} from "@/app/shared/types/Order";
import axios from "axios";
import {useRouter} from "next/navigation";

export default function History() {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderOutput[]>([]);
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get("/api/kitchen");
                setOrders(response.data.filter((order: OrderOutput) => order.isDone));
            } catch (err) {
                console.log(err);
            }
        }
        fetchOrders();
    }, []);

    return (
        <div className="w-full min-h-screen flex flex-col justify-start items-center bg-white">
            <div className={"back-button flex justify-start w-full p-4"}>
                <button
                    onClick={() => {
                        router.back()
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                    Back to orders
                </button>
            </div>
            <h1>Orders Completed</h1>
            <div className={"container p-4 flex flex-col"}>
                {
                    orders.length > 0 ? (
                        orders.map((order) => (
                            <Card
                                key={order._id}
                                orderId={order._id}
                                table={order.table}
                                orderedItems={order.orderedItems}
                                onDone={() => {
                                }}
                                isDone={order.isDone}
                            />
                        ))
                    ) : (
                        <h1 className="mt-[50vh] text-4xl text-center">No Orders To Display</h1>
                    )
                }
            </div>

        </div>

    )
}