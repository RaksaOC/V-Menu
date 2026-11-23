import { Printer, X } from "lucide-react";
import { useRef } from "react";
import { Button, Modal } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { BillLine } from "@vmenu/contracts";

interface Props {
    businessName: string;
    address: string;
    phone: string;
    invoiceId: string;
    date: string;
    /** VM-31: the server's merged lines and totals */
    lines: BillLine[];
    subtotalCents: number;
    totalCents: number;
    onClose: () => void;
}

function Invoice({ businessName, address, phone, invoiceId, date, lines, subtotalCents, totalCents, onClose }: Props) {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const printInvoice = () => {
        if (!invoiceRef.current) return;
        window.print();
    };

    return (
        <Modal
            title={`Invoice ${invoiceId}`}
            onClose={onClose}
            footer={
                <>
                    <Button variant="outline" icon={<X size={16} aria-hidden />} onClick={onClose}>
                        Close
                    </Button>
                    <Button variant="solid" icon={<Printer size={16} aria-hidden />} onClick={printInvoice}>
                        Print
                    </Button>
                </>
            }
        >
            <div ref={invoiceRef} className="bg-white p-6 font-mono text-black">
                <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold uppercase tracking-wide">{businessName}</h1>
                    <p>{address}</p>
                    <p>{phone}</p>
                </header>

                <div className="flex justify-between text-sm mb-4">
                    <p className={"text-left"}>
                        <strong>Invoice ID:</strong> {invoiceId}
                    </p>
                    <p className={"text-right"}>
                        <strong>Date:</strong> {date}
                    </p>
                </div>

                <table className="w-full text-sm border-t border-b border-black mb-6">
                    <thead>
                        <tr className="text-left border-b border-black">
                            <th className="py-2">Item</th>
                            <th className="py-2">Qty</th>
                            <th className="py-2">Price</th>
                            <th className="py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => (
                            <tr key={`${line._id}:${line.priceCents}`} className="border-b border-dashed">
                                <td className="py-2 text-left">{line.name}</td>
                                <td className="py-2 text-left">{line.quantity}</td>
                                <td className="py-2 text-left">{formatMoney(line.priceCents)}</td>
                                <td className="py-2 text-right">{formatMoney(line.totalCents)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end text-sm">
                    <div className="w-full sm:w-1/2">
                        <div className="flex justify-between py-2 border-t border-black">
                            <span>Subtotal</span>
                            <span>{formatMoney(subtotalCents)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t border-black">
                            <span>
                                <strong>Total</strong>
                            </span>
                            <span>
                                <strong>{formatMoney(totalCents)}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <img src="/images/qr.png" alt="QR Code" className="w-24 h-24 border border-black" />
                </div>

                <footer className="text-center text-xs mt-10 border-t pt-4">
                    <p>Thank you for dining with us!</p>
                    <p>Powered by V-Menu</p>
                </footer>
            </div>
        </Modal>
    );
}
export default Invoice;
