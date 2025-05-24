'use client';

import {useEffect, useState, useRef} from "react";
import Card from "./Card";
import {OrderOutput} from "@/app/shared/types/Order";
import axios from "axios";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
import {useParams} from "next/navigation";
import {ChefHat, Clock, History, Bell} from "lucide-react";

export default function KitchenPage() {
    const params = useParams();
    const [orders, setOrders] = useState<OrderOutput[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const previousOrderIdsRef = useRef<string[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get(`/api/kitchen/${params.res}`);
                const activeOrders = response.data.filter((order: OrderOutput) => !order.isDone);
                setOrders(activeOrders);
                setTotalOrders(activeOrders.length);
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
                    toast.info(`${newOrders.length} new order${newOrders.length > 1 ? 's' : ''} received! 🔔`, {
                        position: "top-center",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        theme: "light",
                        className: "!bg-white !text-gray-800 !shadow-xl !border !border-blue-200",
                        progressClassName: "!bg-gradient-to-r !from-blue-500 !to-indigo-500",
                    });
                }

                setOrders(activeOrders);
                setTotalOrders(activeOrders.length);
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
            setTotalOrders(prev => prev - 1);
            toast.success("Order completed! ✅", {
                position: "top-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "light",
                className: "!bg-white !text-gray-800 !shadow-xl !border !border-green-200",
                progressClassName: "!bg-gradient-to-r !from-green-500 !to-emerald-500",
            });
        } catch (err) {
            console.error("Failed to mark order as done:", err);
            toast.error("Failed to update order status", {
                position: "top-center",
                autoClose: 2000,
                theme: "light",
                className: "!bg-white !text-gray-800 !shadow-xl !border !border-red-200",
                progressClassName: "!bg-gradient-to-r !from-red-500 !to-pink-500",
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
            {/* Professional Kitchen Header */}
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
                                    <ChefHat size={32} className="text-white"/>
                                </div>
                                <h1 className="text-4xl font-bold tracking-tight">Kitchen Dashboard</h1>
                            </div>
                            <p className="text-slate-200 text-lg">Monitor and manage incoming orders</p>
                        </div>

                        {/* Kitchen Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                            <div
                                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Clock size={20} className="text-orange-300"/>
                                    <span className="text-orange-300 font-semibold">Active Orders</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{totalOrders}</p>
                            </div>

                            <div
                                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Bell size={20} className="text-blue-300"/>
                                    <span className="text-blue-300 font-semibold">Status</span>
                                </div>
                                <p className="text-lg font-semibold text-white">
                                    {totalOrders > 0 ? 'Active' : 'Standby'}
                                </p>
                            </div>

                            <div
                                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20 flex items-center justify-center">
                                <Link href={`/${params.res}/kitchen/history`}>
                                    <button
                                        className="flex items-center justify-center gap-2 w-full text-white hover:text-slate-200 transition-colors">
                                        <History size={20}/>
                                        <span className="font-semibold">View History</span>
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 sm:px-6 py-8">
                <div className="max-w-6xl mx-auto">
                    {orders.length > 0 ? (
                        <>
                            {/* Section Header */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">Pending Orders</h2>
                                <div
                                    className="h-1 w-20 bg-gradient-to-r from-slate-600 to-gray-600 rounded-full"></div>
                            </div>

                            {/* Orders Grid */}
                            <div className="space-y-6">
                                {orders.map((order) => (
                                    <Card
                                        key={order._id}
                                        orderId={order._id}
                                        table={order.table}
                                        orderedItems={order.orderedItems}
                                        orderedAt={order.createdAt}
                                        onDone={handleOnDone}
                                        isDone={order.isDone}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <div className="max-w-md mx-auto">
                                <div
                                    className="p-8 bg-gray-100 rounded-full w-40 h-40 mx-auto mb-6 flex items-center justify-center">
                                    <ChefHat size={64} className="text-gray-400"/>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-700 mb-3">All caught up!</h2>
                                <p className="text-gray-500 text-lg mb-6">No pending orders at the moment</p>
                                <div
                                    className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium">Waiting for new orders...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Enhanced Toast Container */}
            <ToastContainer
                position="top-center"
                autoClose={2000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                toastClassName="!bg-white !text-gray-800 !shadow-xl !border !border-gray-100"
                progressClassName="!bg-gradient-to-r !from-slate-500 !to-gray-500"
            />
        </div>
    );
}