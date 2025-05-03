import OrderCard from "./OrderCard.jsx";
import axios from "axios";
import {useEffect, useState} from "react";

async function getTableOrders() {
    const response = await axios.get("http://localhost:3002/orders");
    return response.data;
}

async function markTableOrderAsPayed(order) {
    const response = await axios.put(`http://localhost:3002/orders`, order);
    return response.data;
}

export default function Orders() {
    const [orders, setOrders] = useState([]);
    useEffect(() => {
        async function fetchOrders() {
            const data = await getTableOrders();
            const filtered = data.filter(
                (order) => order.isPayed === false && order.orders.length > 0
            );
            setOrders(filtered);
        }

        fetchOrders();
    }, []);


    const handleMarkPaid = async (orderId) => {
        const orderToUpdate = orders.find((order) => order._id === orderId);
        orderToUpdate.isPayed = true;
        await markTableOrderAsPayed(orderToUpdate);

        const response = await axios.put(`http://localhost:3002/orders`, orderToUpdate);
        return response.data;
    };


    return (
        <div className="orders p-4 flex justify-center items-center">
            <div className={"orders-wrapper max-w-[1024px] w-full text-center"}>
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

