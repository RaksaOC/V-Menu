import {useState} from "react";
import Invoice from "./Invoice.jsx";

function OrderCard({orderId, table, orders, onMarkPaid}) {
    const [showInvoice, setShowInvoice] = useState(false);

    const invoiceData = {
        businessName: "The Fancy Spoon",
        address: "123 Main Street, Foodville",
        phone: "(123) 456-7890",
        invoiceId: "INV-20250430-001",
        date: "2025-04-30",
        items: [
            {id: 1, name: "Grilled Chicken", quantity: 2, price: 12.5},
            {id: 2, name: "Iced Tea", quantity: 3, price: 2.0},
        ],
        total: 2 * 12.5 + 3 * 2.0,
    };

    const calculateTotal = () => {
        return orders.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
    };

    return (
        <div
            className="max-w-[1024px] w-[98%] rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-zinc-800 p-4 my-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-white">Table {table}</h3>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Order ID: {orderId}</span>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-3 mb-4">
                {orders.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 border-b last:border-none border-zinc-200 dark:border-zinc-600 py-2"
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 object-cover rounded"
                            />
                            <div>
                                <p className="text-zinc-800 dark:text-white font-semibold">{item.name}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    ${item.price.toFixed(2)} × {item.quantity}
                                </p>
                            </div>
                        </div>
                        <p className="font-bold text-zinc-700 dark:text-white">
                            ${(item.price * item.quantity).toFixed(2)}
                        </p>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-zinc-800 dark:text-white">Total: ${calculateTotal()}</span>
            </div>

            {showInvoice && (
                <Invoice {...invoiceData} onClose={() => setShowInvoice(false)} />
            )}

            <div className="flex gap-4 flex-col sm:flex-row">
                <button
                    onClick={() => setShowInvoice(prev => !prev)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
                >
                    {showInvoice ? "Hide Invoice" : "Show Invoice"}
                </button>
                <button
                    onClick={() => onMarkPaid(orderId)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
                >
                    Mark as Paid
                </button>
            </div>
        </div>
    );
}

export default OrderCard;
