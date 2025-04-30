import './App.css';
import {useEffect, useState} from "react";
import {toast, ToastContainer} from "react-toastify";
import Card from "./components/Card.jsx";
import axios from "axios";

async function getAllOrders() {
    const response = await axios.get("http://localhost:3001/");
    return response.data.filter(order => order.isDone === false);
}

async function markOrderAsDone(order) {
    order.isDone = true;
    const response = await axios.put("http://localhost:3001/", order);
    return response.data;
}

function App() {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        getAllOrders().then(data => {
            setOrders(data);
        }).catch(error => {
            console.error("Failed to fetch orders:", error);
        });
    }, []);

    const handleOnDone = async (orderId) => {
        try {
            const orderToUpdate = orders.find(order => order._id === orderId);
            if (!orderToUpdate) {
                console.error("Order not found.");
                return;
            }

            const updatedOrder = await markOrderAsDone(orderToUpdate);
            if (updatedOrder) {
                setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));

                toast.success("Order has been completed!", {
                    position: "top-center",
                    autoClose: 1000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: false,
                    draggable: false,
                    theme: "light",
                });
            } else {
                console.error("Failed to update the order.");
            }

        } catch (error) {
            console.error("Failed to update order:", error);
        }
    };

    return (
        <>
            <ToastContainer/>
            <div className={"chef-card-wrapper flex flex-col justify-center items-center"}>
                {orders.length > 0 ? orders.map((order) => (
                        <Card
                            key={order._id}
                            orderId={order._id}
                            table={order.table}
                            orders={order.orders}
                            onDone={handleOnDone}
                        />
                    )) :
                    <h1 className={"mt-[50vh] text-5xl text-center"}>No Orders To Display</h1>
                }
            </div>
        </>
    );
}

export default App;
