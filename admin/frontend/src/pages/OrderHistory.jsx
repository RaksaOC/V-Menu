import { useEffect, useState } from "react";
import axios from "axios";
import OrderCard from "../components/OrderCard.jsx";
import { Link } from "react-router";
import SkeletonOrderCard from "../components/SkeletonOrderCard.jsx";

export function OrderHistory() {
    const [orderHistory, setOrderHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get("http://localhost:3002/orders/orderHistory", {
                    headers: {
                        Authorization: localStorage.getItem("token")
                    }});
                if (response.status === 200) {
                    setOrderHistory(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch order history:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="orders flex justify-center items-start py-10 px-4 min-h-screen bg-zinc-900">
            <div className="orders-wrapper max-w-[1024px] w-full text-center flex flex-col gap-6">

                {/* Back to orders button */}
                <div className="w-full flex justify-start items-center">
                    <Link to="/dashboard">
                        <button className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all">
                            ← Back to Orders
                        </button>
                    </Link>
                </div>

                {/* Order History Heading */}
                <h1 className="text-3xl font-semibold text-white">Order History</h1>

                {/* Order Cards */}
                <div className="flex flex-col gap-6">
                    {
                        isLoading ? (
                            <>
                                <SkeletonOrderCard/>
                                <SkeletonOrderCard/>
                                <SkeletonOrderCard/>
                            </>
                        ) : (
                            orderHistory.length > 0 ? (
                                orderHistory.map((order) => (
                                    <OrderCard key={order._id} order={order} />
                                ))
                            ) : (
                                <h2 className="text-lg text-gray-600">No past orders to show.</h2>
                            )
                        )
                    }
                </div>
            </div>
        </div>
    );
}
