'use client'
import {useEffect, useState} from "react";
import Invoice from "./Invoice";
import {Order} from "@/app/shared/types/Order";
import {TableOrderOutput} from "@/app/shared/types/TableOrder";
import {prettyDate} from "@/app/shared/util/formatter";
import {useParams} from "next/navigation";
import { getResFromSlug } from "@/app/shared/util/getResFromSlug";

interface Props {
    order: TableOrderOutput,
    onMarkPaid: (id: string) => void,
}

function OrderCard({order, onMarkPaid}: Props) {
    const [showInvoice, setShowInvoice] = useState(false);
    console.log(order);
    const params = useParams();
    // Access nested structure: order.orders = array of sub-orders, each with its own items
    const subOrders = order.orders;

    // useEffect(() => {
    //     const getResDetails = async () => {
    //         const res = await getResFromSlug(params.slug as string);
    //         setRes(res);
    //     }
    //     getResDetails();
    // }, [])

    return (
        <div className="rounded-2xl overflow-hidden shadow-lg bg-none w-full p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2.5">Table {order.table}</h3>
                {/*<span className="text-sm text-zinc-500 dark:text-zinc-400">Order ID: {order._id}</span>*/}
            </div>

            <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-3 mb-4">
                {subOrders.length > 0 ? subOrders.map((subOrder, index) => (
                    <div key={index} className="m-4 border-b border-zinc-300 dark:border-zinc-600 last:border-b-0">
                        <div className={"flex justify-between w-full items-center"}>
                            <p className="font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
                                Order {index + 1}
                            </p>
                            <p className={"text-gray-400"}>{prettyDate(subOrder.createdAt)}</p>
                        </div>

                        {subOrder.orderedItems.map((item) => (
                            <div
                                key={item.item._id}
                                className="flex items-center justify-between gap-2 border-b last:border-none border-zinc-200 dark:border-zinc-600 py-2"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={item.item.image}
                                        alt={item.item.name}
                                        className="w-10 h-10 object-cover rounded"
                                    />
                                    <div>
                                        <p className="text-zinc-800 dark:text-white font-semibold">{item.item.name}</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            ${(item.item.price).toFixed(2)} × {item.quantity}
                                        </p>
                                    </div>
                                </div>
                                <p className="font-bold text-zinc-700 dark:text-white">
                                    ${((item.item.price) * item.quantity).toFixed(2)}
                                </p>
                            </div>
                        ))}
                    </div>
                )) : (
                    <p className="text-zinc-500 dark:text-zinc-400">No orders found.</p>
                )}
            </div>

            {showInvoice && (
                <Invoice
                    businessName={params.res as string}
                    address={"Address will be supported soon"}
                    phone={ "(123) 456-7890"}
                    invoiceId={`${order._id}`}
                    date={prettyDate(new Date().toLocaleString())}
                    items={subOrders.flatMap(sub => sub.orderedItems)}
                    onClose={() => setShowInvoice(false)}
                />
            )}

            <div className="flex gap-4 flex-col sm:flex-row">
                <button
                    onClick={() => setShowInvoice(prev => !prev)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
                >
                    {showInvoice ? "Hide Invoice" : "Show Invoice"}
                </button>
                {
                    !order.isPayed ? (<button
                        onClick={() => onMarkPaid(order._id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
                    >
                        Mark as Paid
                    </button>) : null
                }

            </div>
        </div>
    );
}

export default OrderCard;
