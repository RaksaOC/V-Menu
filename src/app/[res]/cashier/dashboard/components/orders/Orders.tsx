import OrderCard from "./OrderCard";
import axios from "axios";
import {useEffect, useState} from "react";
import SkeletonOrderCard from "@/app/[res]/common/SkeletonOrderCard";
import Link from "next/link";
import {TableOrderOutput} from "@/app/shared/types/TableOrder";
import {OrderOutput} from "@/app/shared/types/Order";
import api from "@/app/shared/lib/axios";
import {useParams, useRouter} from "next/navigation";
import {Clock, ShoppingCart} from "lucide-react";

async function getTableOrders() {

}

export default function Orders() {
    const [orders, setOrders] = useState<TableOrderOutput[]>([]);
    const params = useParams();
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<TableOrderOutput[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        async function fetchOrders() {
            try {
                const response = await api.get(`/api/cashier/${params.res}/dashboard/orders`);
                const filtered = response.data.filter(
                    (order: TableOrderOutput) => !order.isPayed && order.orders.length > 0
                );
                setOrders(filtered);
            } catch (err) {
                console.log(err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchOrders();
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get(`/api/cashier/${params.res}/dashboard/orders`);
                setHistory(response.data.filter((d: TableOrderOutput) => d.isPayed));
            } catch (err) {
                console.error("Failed to fetch order history:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);


    const handleMarkPaid = async (orderId: string) => {
        const orderToMark = orders.find((order: TableOrderOutput) => order._id === orderId) || null;
        if (!orderToMark) {
            return;
        }
        const response = await api.patch(`/api/cashier/${params.res}/dashboard/orders/${orderId}`, {isPayed: orderToMark.isPayed});
        if (response.status !== 200) {
            return;
        }

        location.reload();
    };

    return (
        <div className="orders w-full flex justify-center items-center">
            <div className={"orders-wrapper w-full text-center flex flex-col gap-6"}>
                {
                    isLoading && (
                        <>
                            <SkeletonOrderCard/>
                            <SkeletonOrderCard/>
                            <SkeletonOrderCard/>
                        </>
                    )
                }
                <div className={"order-orderHistory w-full flex justify-between items-center p-4"}>
                    <div className="flex items-center space-x-2 text-lg font-semibold ">
                        {showHistory ? <Clock size={20}/> : <ShoppingCart size={20}/>}
                        <p>{showHistory ? "Order History" : "Active Orders"}</p>
                    </div>
                    <button className={"bg-blue-600 text-white py-2 px-4 rounded-xl cursor-pointer "}
                            onClick={() => {
                                setShowHistory(!showHistory);
                            }}>
                        {showHistory ? "View Active Orders" : "View Order History"}
                    </button>
                </div>
                {
                    !showHistory ? (
                        <>
                            {
                                orders.length > 0 ?
                                    orders.map((order) => (
                                        <OrderCard key={order._id} order={order} onMarkPaid={handleMarkPaid}/>
                                    )) :
                                    <div className={"w-full h-96 flex justify-center items-center"}>
                                        <h1 className={"text-3xl text-center"}>No orders to display</h1>
                                    </div>
                            }
                        </>
                    ) : (
                        <>
                            {
                                history.length > 0 ? (
                                    orders.map((order) => (
                                        <OrderCard key={order._id} order={order} onMarkPaid={handleMarkPaid}/>
                                    ))
                                ) : (
                                    <div className={"w-full h-96 flex justify-center items-center"}>
                                        <h1 className={"text-3xl text-center"}>No orders history to display</h1>
                                    </div>
                                )
                            }
                        </>
                    )
                }

            </div>

        </div>
    )
        ;
}

