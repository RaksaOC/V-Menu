'use client'

import Card from "@/app/[res]/kitchen/Card";
import {useEffect, useState} from "react";
import {OrderOutput} from "@/app/shared/types/Order";
import axios from "axios";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";

export default function History() {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderOutput[]>([]);
    const params = useParams();
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get(`/api/kitchen/${params.res}`);
                setOrders(response.data.filter((order: OrderOutput) => order.isDone));
            } catch (err) {
                console.log(err);
            }
        }
        fetchOrders();
    }, []);

    return (
        <div className="w-full min-h-screen flex flex-col justify-start items-center bg-white">
            <div className={"back-button-wrapper flex w-full justify-center"}>
                <div className="back-button flex justify-start w-full p-4 max-w-[1024px]">
                    <button
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer"
                        onClick={() => router.replace("./")}>
                        <div className={"content flex justify-between items-center gap-1"}>
                            <ArrowLeft/>
                            <p>View Orders</p>
                        </div>
                    </button>
                </div>
            </div>
            <h1 className={"text-3xl font-semibold"}>Orders Completed</h1>
            <div className={"container flex flex-col justify-center items-center w-full max-w-[1024px]"}>
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