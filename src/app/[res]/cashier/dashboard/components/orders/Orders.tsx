import OrderCard from "./OrderCard";
import axios from "axios";
import {useEffect, useState} from "react";
import SkeletonOrderCard from "@/app/[res]/common/SkeletonOrderCard";
import Link from "next/link";
import {TableOrderOutput} from "@/app/shared/types/TableOrder";
import {OrderOutput} from "@/app/shared/types/Order";
import api from "@/app/shared/lib/axios";
import {useParams, useRouter} from "next/navigation";

async function getTableOrders() {
    const response = await api.get("/api/cashier/dashboard/orders");
    return response.data;
}

export default function Orders() {
    const [orders, setOrders] = useState<TableOrderOutput[]>([]);
    const router = useRouter();
    const params = useParams();

    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        async function fetchOrders() {
            const data = await getTableOrders();
            const filtered = data.filter(
                (order: TableOrderOutput) => !order.isPayed && order.orders.length > 0
            );
            setOrders(filtered);
            setIsLoading(false);
        }

        fetchOrders();
    }, []);


    const handleMarkPaid = async (orderId: string) => {
        const orderToMark = orders.find((order: TableOrderOutput) => order._id === orderId) || null;
        if (!orderToMark) {
            return;
        }
        const response = await api.patch(`/api/cashier/dashboard/orders/${orderId}`, {isPayed: orderToMark.isPayed});
        if (response.status !== 200) {
            return;
        }

        location.reload();
    };

    return (
        <div className="orders w-full flex justify-center items-center">
            <div className={"orders-wrapper max-w-[1024px] w-full text-center flex flex-col gap-6"}>
                {
                    isLoading && (
                        <>
                            <SkeletonOrderCard/>
                            <SkeletonOrderCard/>
                            <SkeletonOrderCard/>
                        </>
                    )
                }
                <div className={"order-orderHistory w-full flex justify-end items-center"}>
                    <button className={"bg-blue-600 text-white py-2 px-4 rounded-xl cursor-pointer "} onClick={() => router.push(`/${params.res}/cashier/dashboard/orderHistory`)} >
                        View Order History
                    </button>
                </div>
                {
                    orders.length > 0 ?
                        orders.map((order) => (
                            <OrderCard key={order._id} order={order} onMarkPaid={handleMarkPaid}/>
                        )) :
                        <div className={"w-full h-96 flex justify-center items-center"}>
                            <h1 className={"text-3xl text-center"}>No orders to display</h1>
                        </div>
                }
            </div>

        </div>
    );
}

