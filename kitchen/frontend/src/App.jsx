import './App.css';
import {useEffect, useState} from "react";
import {ToastContainer} from "react-toastify";
import Card from "./components/Card.jsx";
import axios from "axios";

async function getAllOrders() {
    const response = await axios.get("http://localhost:3001/");
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

    const handleOnDone = (orderId) => {
        const filteredOrders = orders.filter(order => order._id !== orderId);
        setOrders(filteredOrders);
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
                            orders={order.orders} // this is a sub-array of items in one order
                            onDone={handleOnDone}
                        />
                    )) :
                    <h1 className={"mt-[50vh] text-5xl"}>No Orders To Display</h1>
                }
            </div>
        </>
    );
}

export default App;
