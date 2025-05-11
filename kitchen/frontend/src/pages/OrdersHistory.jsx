import axios from "axios";
import {useEffect, useState} from "react";
import Orders from "./Orders.jsx";
import Card from "../components/Card.jsx";
import {Link} from "react-router";

export default function OrdersHistory() {
    const [history, setHistory] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            const response = await axios.get("http://localhost:3001/api/orders/history");
            if (response && response.status === 200) {
                setHistory(response.data);
            }
        }
        fetchData();
    }, [])

    return (
        <div className={"order-history flex flex-col justify-start items-center"}>
            <div className={"back-button flex justify-start w-full p-4"}>
                <Link to={"/"}>
                    <button
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer"
                    >
                        Back to orders
                    </button>
                </Link>
            </div>
            <h1 className={"mt-2 text-3xl font-semibold "}>Order History</h1>
            {
                history.length > 0 ? (
                    history.map((item, index) => (
                        <Card
                            key={index}
                            table={item.table}
                            orders={item.orders}
                            orderId={item._id}
                            isDone={item.isDone}
                        />
                    ))
                ) : (
                    <div className={"w-full h-96 flex justify-center items-center"}>
                        <h1 className={"text-3xl text-center"}>No Order History to display</h1>
                    </div>
                )
            }

        </div>
    );

}