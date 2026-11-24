import { AlertCircle, Receipt, RotateCcw } from "lucide-react";
import { useMoney } from "@/components/money/MoneyProvider";

/** The bar fixed at the bottom: why the last order failed (VM-06), the total, and Place Order. */
export default function CartBottomBar({
    orderError,
    hasItems,
    itemCount,
    totalCents,
    isPlacingOrder,
    placeOrder,
}: {
    orderError: { message: string; retry: boolean } | null;
    hasItems: boolean;
    itemCount: number;
    totalCents: number;
    isPlacingOrder: boolean;
    placeOrder: () => void;
}) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50">
            {/* Backdrop blur effect */}
            <div className="absolute inset-0 bg-white/90 backdrop-blur-lg border-t border-gray-200/50"></div>

            <div className="relative p-4">
                <div className="max-w-4xl mx-auto">
                    {orderError && (
                        <div
                            role="alert"
                            className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            <p className="flex items-start gap-2">
                                <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />
                                <span>{orderError.message}</span>
                            </p>
                            {orderError.retry && (
                                <button
                                    type="button"
                                    onClick={placeOrder}
                                    disabled={isPlacingOrder}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                                >
                                    <RotateCcw size={14} aria-hidden /> Try again
                                </button>
                            )}
                        </div>
                    )}
                    {hasItems && (
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-lg font-bold text-gray-800">Total: {money(totalCents)}</p>
                                <p className="text-sm text-gray-500">
                                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <button
                                onClick={placeOrder}
                                disabled={isPlacingOrder}
                                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isPlacingOrder ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Placing Order...
                                    </>
                                ) : (
                                    <>
                                        <Receipt size={18} />
                                        Place Order
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
