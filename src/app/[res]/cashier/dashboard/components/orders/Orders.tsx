import OrderCard from "./OrderCard";
import axios from "axios";
import {useEffect, useState} from "react";
import SkeletonOrderCard from "./SkeletonOrderCard";
import Link from "next/link";
import {TableOrderOutput} from "@/app/shared/types/TableOrder";

async function getTableOrders() {
    const response = await axios.get("/api/cashier/dashboard/orders",
        {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
    return response.data;
}

export default function Orders() {
    const [orders, setOrders] = useState<TableOrderOutput[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        async function fetchOrders() {
            const data = await getTableOrders();
            const filtered = data.filter(
                (order : TableOrderOutput) => !order.isPayed && order.orders.length > 0
            );
            setOrders(filtered);
            setIsLoading(false);
        }

        fetchOrders();
    }, []);


    const handleMarkPaid = async (orderId) => {
        const isPayed = orders.find((order) => order._id === orderId).isPayed;

        const response = await axios.patch(`http://localhost:3002/api/orders/${orderId}/pay`, {isPayed: isPayed}, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
        if (response.status !== 200) {
            return;
        }

        location.reload();
    };


    return (
        <div className="orders flex justify-center items-center">
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
                <div className={"order-history w-full flex justify-end items-center"}>
                    <Link href="/orderHistory">
                        <button className={"bg-blue-600 text-white py-2 px-4 rounded-xl cursor-pointer "}>View Order
                            History
                        </button>
                    </Link>
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

