'use client';

import { useEffect, useState } from "react";
import { TableOrderOutput } from "@/app/shared/types/TableOrder";
import api from "@/app/shared/lib/axios";
import SkeletonOrderCard from "@/app/[res]/common/SkeletonOrderCard";
import OrderCard from "@/app/[res]/cashier/dashboard/components/orders/OrderCard";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function OrderHistoryPage() {
    const [orderHistory, setOrderHistory] = useState<TableOrderOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get("/api/cashier/dashboard/orders");
                setOrderHistory(response.data.filter((d: TableOrderOutput) => d.isPayed));
            } catch (err) {
                console.error("Failed to fetch order history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="w-full min-h-screen bg-zinc-900 flex flex-col items-center px-4 py-6">
            {/* Back Button */}
            <div className="w-full max-w-[1024px] flex justify-start mb-6">
                <button
                    onClick={() => router.push(`/${params.res}/cashier/dashboard`)}
                    className="flex items-center gap-2 bg-blue-700 text-white hover:bg-blue-800 font-medium p-2.5 rounded-xl"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Dashboard</span>
                </button>
            </div>

            {/* Page Heading */}
            <h1 className="text-3xl text-white font-bold mb-4">Order History</h1>
            <p className="text-zinc-400 mb-8 text-center">Review all previously paid or completed orders.</p>

            {/* Order List */}
            <div className="w-full max-w-[1024px] flex flex-col gap-4">
                {loading ? (
                    <>
                        <SkeletonOrderCard />
                        <SkeletonOrderCard />
                        <SkeletonOrderCard />
                    </>
                ) : orderHistory.length > 0 ? (
                    orderHistory.map((order) => (
                        <OrderCard key={order._id} order={order} onMarkPaid={() => {}} />
                    ))
                ) : (
                    <h2 className="text-white text-center text-2xl mt-10">No Order History to display</h2>
                )}
            </div>
        </div>
    );
}
