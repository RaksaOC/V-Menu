import OrderCard from "./OrderCard.jsx";
import axios from "axios";
import {useEffect, useState} from "react";
import SkeletonOrderCard from "./SkeletonOrderCard.jsx";
import {Link} from "react-router";

async function getTableOrders() {
    const response = await axios.get("http://localhost:3002/orders",
        {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
    return response.data;
}

async function markTableOrderAsPayed(order) {
    const response = await axios.put(`http://localhost:3002/orders`, order,
        {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
    return response.data;
}

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        async function fetchOrders() {
            const data = await getTableOrders();
            const filtered = data.filter(
                (order) => order.isPayed === false && order.orders.length > 0
            );
            setOrders(filtered);
            setIsLoading(false);
        }

        fetchOrders();
    }, []);


    const handleMarkPaid = async (orderId) => {
        const orderToUpdate = orders.find((order) => order._id === orderId);
        orderToUpdate.isPayed = true;
        await markTableOrderAsPayed(orderToUpdate);

        const response = await axios.put(`http://localhost:3002/orders`, orderToUpdate);
        if (response.status === 200) {
            console.log(response);
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
                    <Link to="/orderHistory">
                        <button className={"bg-blue-600 text-white p-2.5 rounded-xl cursor-pointer "}>View Order
                            History
                        </button>
                    </Link>
                </div>
                {
                    orders.length > 0 ?
                        orders.map((order) => (
                            <OrderCard key={order._id} order={order} onMarkPaid={handleMarkPaid}/>
                        )) :
                        <h1>No orders to display</h1>
                }
            </div>

        </div>
    );
}

