import { Printer, X } from "lucide-react";
import type { BillLine } from "@vmenu/contracts";
import { Button, Modal } from "@/components/ui";
import { useMoney, useRestaurantSettings } from "@/components/money/MoneyProvider";

interface Props {
    /** shown until the restaurant's settings load */
    slug: string;
    table: string;
    /** short bill number, as on the cashier's screen */
    billNumber: string;
    date: string;
    /** VM-31: the server's merged lines and totals */
    lines: BillLine[];
    subtotalCents: number;
    totalCents: number;
    onClose: () => void;
}

/**
 * VM-24: the invoice the cashier prints. The restaurant's real name, the table, bill number, date
 * and time, the server's lines and totals in the restaurant's currency, and the owner's payment QR
 * when there is one. Printing prints only this (see the print rules in globals.css).
 */
function Invoice({ slug, table, billNumber, date, lines, subtotalCents, totalCents, onClose }: Props) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const settings = useRestaurantSettings();

    return (
        <Modal
            title={`Invoice #${billNumber}`}
            onClose={onClose}
            footer={
                <>
                    <Button variant="outline" icon={<X size={16} aria-hidden />} onClick={onClose}>
                        Close
                    </Button>
                    <Button variant="solid" icon={<Printer size={16} aria-hidden />} onClick={() => window.print()}>
                        Print
                    </Button>
                </>
            }
        >
            <div data-print className="bg-[var(--bg)] p-6 font-mono text-black">
                <header className="mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase tracking-wide break-words">{settings?.name ?? slug}</h1>
                    <p className="mt-1">Table {table}</p>
                </header>

                <div className="mb-4 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                    <p>
                        <strong>Bill:</strong> #{billNumber}
                    </p>
                    <p className="text-right">
                        <strong>Date:</strong> {date}
                    </p>
                </div>

                <table className="mb-6 w-full border-t border-b border-black text-sm">
                    <thead>
                        <tr className="border-b border-black text-left">
                            <th className="py-2 pr-3">Item</th>
                            <th className="py-2 pr-3">Qty</th>
                            {/* narrow screens and receipt paper: name, quantity and amount only */}
                            <th className="hidden py-2 pr-3 sm:table-cell">Price</th>
                            <th className="py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => (
                            <tr key={`${line._id}:${line.priceCents}`} className="border-b border-dashed">
                                <td className="py-2 pr-3 text-left">{line.name}</td>
                                <td className="py-2 pr-3 text-left">{line.quantity}</td>
                                <td className="hidden whitespace-nowrap py-2 pr-3 text-left sm:table-cell">{money(line.priceCents)}</td>
                                <td className="whitespace-nowrap py-2 text-right">{money(line.totalCents)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end text-sm">
                    <div className="w-full sm:w-2/3">
                        <div className="flex justify-between gap-4 border-t border-black py-2">
                            <span>Subtotal</span>
                            <span className="whitespace-nowrap">{money(subtotalCents)}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-black py-2">
                            <span>
                                <strong>Total</strong>
                            </span>
                            <span className="whitespace-nowrap">
                                <strong>{money(totalCents)}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {settings?.paymentQrUrl && (
                    <figure className="mt-8 flex flex-col items-center gap-2">
                        <img src={settings.paymentQrUrl} alt="Scan to pay" className="h-40 w-40 object-contain" />
                        <figcaption className="text-xs">Scan to pay</figcaption>
                    </figure>
                )}

                <footer className="mt-10 border-t pt-4 text-center text-xs">
                    <p>Thank you for dining with us!</p>
                    <p>Powered by V-Menu</p>
                </footer>
            </div>
        </Modal>
    );
}
export default Invoice;
