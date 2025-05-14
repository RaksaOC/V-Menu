import {Item} from "@/app/shared/types/Item";

interface Props {
    businessName: string;
    address: string;
    phone: string;
    invoiceId: string;
    date: string;
    items: Item[],
    onClose: () => void;
}


function Invoice({ businessName, address, phone, invoiceId, date, items, onClose }:Props) {
    // Combine duplicate items by id
    const mergedItems = [];

    items.forEach((item) => {
        const existing = mergedItems.find((i) => i.id === item.id);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            mergedItems.push({ ...item });
        }
    });

    const total = mergedItems.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto px-4 py-6">
            <div className="relative bg-white text-black p-8 font-mono border border-black max-w-[1024px] w-full mx-auto shadow-xl rounded-xl mb-8">
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold uppercase tracking-wide">{businessName}</h1>
                    <p>{address}</p>
                    <p>{phone}</p>
                </header>

                <div className="flex justify-between text-sm mb-4">
                    <p className={"text-left"}><strong>Invoice ID:</strong> {invoiceId}</p>
                    <p className={"text-right"}><strong>Date:</strong> {date}</p>
                </div>

                <table className="w-full text-sm border-t border-b border-black mb-6">
                    <thead>
                    <tr className="text-left border-b border-black">
                        <th className="py-2">Item</th>
                        <th className="py-2">Qty</th>
                        <th className="py-2">Price</th>
                        <th className="py-2 text-right">Subtotal</th>
                    </tr>
                    </thead>
                    <tbody>
                    {mergedItems.map((item, index) => (
                        <tr key={index} className="border-b border-dashed">
                            <td className="py-2 text-left">{item.name}</td>
                            <td className="py-2 text-left">{item.quantity}</td>
                            <td className="py-2 text-left">${parseFloat(item.price).toFixed(2)}</td>
                            <td className="py-2 text-right">
                                ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                <div className="flex justify-end text-sm">
                    <div className="w-full sm:w-1/2">
                        <div className="flex justify-between py-2 border-t border-black">
                            <span><strong>Total</strong></span>
                            <span><strong>${total.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <img
                        src=""
                        alt="QR Code"
                        className="w-24 h-24 border border-black"
                    />
                </div>

                <footer className="text-center text-xs mt-10 border-t pt-4">
                    <p>Thank you for dining with us!</p>
                    <p>Powered by V-Menu</p>
                </footer>
            </div>

            <div className="flex justify-center">
                <button
                    onClick={onClose}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded flex items-center gap-2"
                >
                    <span>&#10005;</span> Close
                </button>
            </div>
        </div>
    );
}

export default Invoice;
