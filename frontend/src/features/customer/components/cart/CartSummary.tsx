import { useMoney } from "@/components/money/MoneyProvider";

/** How many items are in the cart and what they cost: one mono line above the list (VM-33). */
export default function CartSummary({ itemCount, totalCents }: { itemCount: number; totalCents: number }) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    return (
        <div className="mb-3 flex items-center justify-between font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] text-[var(--muted)]">
            <p>
                Order Summary · {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
            </p>
            <span>{money(totalCents)}</span>
        </div>
    );
}
