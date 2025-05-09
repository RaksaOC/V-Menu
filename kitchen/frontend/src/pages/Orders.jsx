import { useEffect, useState, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import Card from "../components/Card.jsx";
import {Link} from "react-router";

async function getAllOrders() {
    const response = await axios.get("http://localhost:3001/");
    return response.data.filter(order => order.isDone === false);
}

async function markOrderAsDone(order) {
    order.isDone = true;
    const response = await axios.put("http://localhost:3001/", order);
    return response.data;
}

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const previousOrderIdsRef = useRef([]);

    useEffect(() => {
        getAllOrders().then(data => {
            setOrders(data);
            previousOrderIdsRef.current = data.map(o => o._id);
        }).catch(err => console.error("Initial fetch failed:", err));

        const intervalId = setInterval(() => {
            getAllOrders().then(newData => {
                const newOrderIds = newData.map(o => o._id);
                const previousOrderIds = previousOrderIdsRef.current;

                const newOrders = newOrderIds.filter(id => !previousOrderIds.includes(id));
                if (newOrders.length > 0) {
                    toast.info("A new order has been placed!", {
                        position: "top-center",
                        autoClose: 1000,
                        hideProgressBar: true,
                        closeOnClick: true,
                        pauseOnHover: false,
                        draggable: false,
                        theme: "light",
                    });
                }

                setOrders(newData);
                previousOrderIdsRef.current = newOrderIds;
            }).catch(err => {
                console.error("Polling failed:", err);
            });
        }, 2000);

        return () => clearInterval(intervalId);
    }, []);

    const handleOnDone = async (orderId) => {
        try {
            const orderToUpdate = orders.find(order => order._id === orderId);
            if (!orderToUpdate) return;

            const updatedOrder = await markOrderAsDone(orderToUpdate);
            if (updatedOrder) {
                setOrders(prev => prev.filter(order => order._id !== orderId));
                toast.success("Order has been completed!", {
                    position: "top-center",
                    autoClose: 1000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: false,
                    draggable: false,
                    theme: "light",
                });
            }
        } catch (error) {
            console.error("Failed to update order:", error);
        }
    };

    return (
        <>
            <ToastContainer />
            <header className="header p-2.5">
                <p className="text-center text-black text-3xl">V-Menu Kitchen</p>
            </header>
            <div className={"back-button flex justify-end w-full p-4"}>
                <Link to={"/orderHistory"}>
                    <button
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer"
                    >
                        View Order History
                    </button>
                </Link>
            </div>
            <div className="chef-card-wrapper flex flex-col justify-center items-center">
                {orders.length > 0 ? (
                    orders.map((order) => (
                        <Card
                            key={order._id}
                            orderId={order._id}
                            table={order.table}
                            orders={order.orders}
                            onDone={handleOnDone}
                            isDone={order.isDone}
                        />
                    ))
                ) : (
                    <h1 className="mt-[50vh] text-4xl text-center">No Orders To Display</h1>
                )}
            </div>
        </>
    );
}
