import React from "react";
import { useEffect, useState} from "react";
import axios from "axios";

export default function Overview() {
    const [isLoading, setIsLoading] = useState(true);
    const [overviewData, setOverviewData] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get("http://localhost:3002/api/overview");
                setOverviewData(response.data);
            } catch (error) {
                console.error("Error fetching overview:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <h1 className="text-3xl font-semibold text-gray-500">No data to display</h1>
            </div>
        );
    }

    const cards = [
        {
            label: "Active Tables",
            value: overviewData.numOfActiveTables,
            icon: "src/assets/activeTable.svg"
        },
        {
            label: "Unpaid Orders",
            value: overviewData.numOfPayments,
            icon: "src/assets/unpaidOrder.svg"
        },
        {
            label: "Tables",
            value: overviewData.numOfTables,
            icon: "src/assets/table.svg"
        },
        {
            label: "Menu Items",
            value: overviewData.numOfItems,
            icon: "src/assets/item.svg"
        },
        {
            label: "Orders Completed",
            value: overviewData.numOfOrders,
            icon: "src/assets/ordersCompleted.svg"
        },
        {
            label: "Payments Completed",
            value: overviewData.numOfPayments,
            icon: "src/assets/payment.svg"
        }
    ];

    return (
        <div className="overview py-12 flex justify-center items-center bg-transparent min-h-[50vh]">
            <div
                className="overview-wrapper grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-6xl w-full px-4">
                {cards.map((card, index) => (
                    <React.Fragment key={index}>
                        <div
                            className="card bg-blue-900 shadow-md rounded-2xl p-6 gap-1 flex flex-row items-end hover:shadow-xl transition duration-300 text-white">
                            <div className="icon w-20 h-20 rounded-full flex items-center justify-center text-2xl mr-4">
                                <img src={card.icon} alt="icon" className="h-full w-full object-cover rounded-full"/>
                            </div>
                            <div className="text-content h-full flex flex-col justify-around">
                                <p className="text-blue-200 mt-1 text-sm tracking-wide uppercase font-medium">
                                    {card.label}
                                </p>
                                <h2 className="text-3xl font-extrabold">{card.value ?? 0}</h2>
                            </div>
                        </div>

                        {index === 1 && (
                            <div className="col-span-full h-0"><br/></div>
                        )}
                    </React.Fragment>
                ))}
            </div>


        </div>

    );
}
