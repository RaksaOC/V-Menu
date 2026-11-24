import { Receipt } from "lucide-react";
import { useMoney } from "@/components/money/MoneyProvider";

/** How many items are in the cart and what they cost. */
export default function CartSummary({ itemCount, totalCents }: { itemCount: number; totalCents: number }) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    return (
        <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-full">
                        <Receipt size={18} className="text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">Order Summary</h3>
                        <p className="text-sm text-gray-500">
                            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{money(totalCents)}</p>
                </div>
            </div>
        </div>
    );
}
