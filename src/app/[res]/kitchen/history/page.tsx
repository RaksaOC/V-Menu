'use client'

import Card from "@/app/[res]/kitchen/Card";
import {useEffect, useState} from "react";
import {OrderOutput} from "@/app/shared/types/Order";
import axios from "axios";
import {useParams, useRouter} from "next/navigation";
import {ArrowLeft, Bell, ChefHat, Clock, History as His} from "lucide-react";
import Link from "next/link";
import api from "@/app/shared/lib/axios";

export default function History() {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderOutput[]>([]);
    const params = useParams();
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get(`/api/kitchen/${params.res}`);
                setOrders(response.data.filter((order: OrderOutput) => order.isDone));
            } catch (err) {
                console.log(err);
            }
        }
        fetchOrders();
    }, []);
    let totalOrders = orders.length;

    return (
        <>
            <header
                className="relative bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 text-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-black/5">
                    <div
                        className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}>
                    </div>
                </div>
                <div className="relative px-6 py-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-6">
                            <div className="flex items-center justify-center gap-4 mb-4">
                                <div className="p-3 bg-white/15 rounded-full backdrop-blur-sm">
                                    <His size={32} className="text-white"/>
                                </div>
                                <h1 className="text-4xl font-bold tracking-tight">Kitchen History</h1>
                            </div>
                            <p className="text-slate-200 text-lg">View completed orders</p>
                        </div>
                    </div>
                </div>
            </header>
            <div className="w-full min-h-screen flex flex-col justify-start items-center bg-white">

                <div className={"back-button-wrapper flex w-full justify-center"}>
                    <div className="back-button flex justify-start w-full py-4 max-w-[1024px]">
                        <div
                            className="bg-zinc-600 backdrop-blur-sm rounded-2xl px-3 py-2 text-center border border-zinc-500 flex items-center justify-center">
                            <button
                                onClick={() => router.push(`/${params.res}/kitchen`)}
                                className="bg-zinc-600 flex items-center justify-center text-white"
                            >
                                <ArrowLeft/>
                                <p>View Orders</p>
                            </button>
                        </div>
                    </div>
                </div>
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
                                    orderedAt={order.createdAt}
                                    isDone={order.isDone}
                                />
                            ))
                        ) : (
                            <h1 className="mt-[50vh] text-4xl text-center">No Orders To Display</h1>
                        )
                    }
                </div>

            </div>
        </>


    )
}