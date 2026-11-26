import { AlertCircle, Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { useMoney } from "@/components/money/MoneyProvider";

/** The summary kept at the bottom (VM-33): why the last order failed (VM-06), the total, and the
 *  one coral Place order button. */
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
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] bg-[var(--bg)] px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-3xl">
                {orderError && (
                    <div
                        role="alert"
                        className="mb-3 flex items-start justify-between gap-3 rounded-[var(--r-chip)] border border-[var(--bad)] bg-[var(--bad-soft)] p-3 text-sm text-[var(--ink)]"
                    >
                        <p className="flex items-start gap-2">
                            <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-[var(--bad)]" />
                            <span>{orderError.message}</span>
                        </p>
                        {orderError.retry && (
                            <Button
                                variant="solid"
                                size="sm"
                                className="min-h-11 shrink-0"
                                onClick={placeOrder}
                                disabled={isPlacingOrder}
                                icon={<RotateCcw size={14} aria-hidden />}
                            >
                                Try again
                            </Button>
                        )}
                    </div>
                )}
                {hasItems && (
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] text-[var(--muted)]">
                                {itemCount} item{itemCount !== 1 ? "s" : ""}
                            </p>
                            <p className="font-[family-name:var(--f-mono)] text-xl font-semibold text-[var(--ink)]">
                                Total: {money(totalCents)}
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            className="min-h-12 px-6 text-base"
                            onClick={placeOrder}
                            loading={isPlacingOrder}
                            icon={<Receipt size={18} aria-hidden />}
                        >
                            {isPlacingOrder ? "Placing order…" : "Place order"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
