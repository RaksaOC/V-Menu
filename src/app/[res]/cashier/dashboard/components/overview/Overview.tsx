import React from "react";
import {useEffect, useState} from "react";
import axios from "axios";
import SkeletonOverviewCard from "../../../common/SkeletonOverviewCard";

import {Overview as OverviewData} from "@/app/shared/types/Overview";

export default function Overview() {
    const [isLoading, setIsLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<OverviewData>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get("/api/cashier/dashboard/overview");
                setOverviewData(await response.data || {});
            } catch (error) {
                console.error("Error fetching overview:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const cards = overviewData ? [
        {
            label: "Active Tables",
            value: overviewData.numOfActiveTables,
            icon: "/images/activeTable.svg"
        },
        {
            label: "Unpaid Orders",
            value: overviewData.numOfUnpaidOrders,
            icon: "/images/unpaidOrder.svg"
        },
        {
            label: "Tables",
            value: overviewData.numOfTables,
            icon: "/images/table.svg"
        },
        {
            label: "Menu Items",
            value: overviewData.numOfItems,
            icon: "/images/item.svg"
        },
        {
            label: "Orders Completed",
            value: overviewData.numOfOrders,
            icon: "/images/ordersCompleted.svg"
        },
        {
            label: "Payments Completed",
            value: overviewData.numOfPayments,
            icon: "/images/payment.svg"
        }
    ] : [];

    return (
        <div className="overview py-12 w-full flex justify-center items-center bg-transparent min-h-[50vh]">
            <div
                className="overview-wrapper grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full">
                {isLoading ? (
                    <>
                        <SkeletonOverviewCard/>
                        <SkeletonOverviewCard/>
                        <div className="col-span-full h-0"/>
                        <SkeletonOverviewCard/>
                        <SkeletonOverviewCard/>
                        <SkeletonOverviewCard/>
                    </>
                ) : cards && cards.length > 0 ? (
                    cards.map((card, index) => (
                        <React.Fragment key={index}>
                            <div
                                className="card w-full bg-blue-900 shadow-md rounded-2xl p-6 gap-1 flex flex-row items-end hover:shadow-xl transition duration-300 text-white">
                                <div
                                    className="icon w-20 h-20 rounded-full flex items-center justify-center text-2xl mr-4">
                                    <img src={card.icon} alt="icon"
                                         className="h-full w-full object-cover rounded-full"/>
                                </div>
                                <div className="text-content h-full flex flex-col justify-around">
                                    <p className="text-blue-200 mt-1 text-sm tracking-wide uppercase font-medium">
                                        {card.label}
                                    </p>
                                    <h2 className="text-3xl font-extrabold">{card.value ?? 0}</h2>
                                </div>
                            </div>

                            {index === 1 && (
                                <div className="col-span-full h-0"/>
                            )}
                        </React.Fragment>
                    ))
                ) : (
                    <div className="col-span-full h-96 flex justify-center items-center">
                        <h1 className="text-3xl text-center text-white">No Data to Display</h1>
                    </div>
                )}
            </div>
        </div>


    );
}
