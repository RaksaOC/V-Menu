"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMoney } from "@/components/money/MoneyProvider";
import { useCart } from "@/features/customer/use-cart";

/** VM-33: the bar at the bottom of the menu: what's in the cart and "View order". Hidden while the
 *  cart is empty. */
export default function MenuCartBar({ slug, table, cartHref }: { slug: string; table: string; cartHref: string }) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const cart = useCart(slug, table);
    const count = cart.reduce((sum, line) => sum + line.quantity, 0);
    if (count === 0) return null;
    const totalCents = cart.reduce((sum, line) => sum + line.item.priceCents * line.quantity, 0);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
            <Link
                href={cartHref}
                className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 rounded-[var(--r-card)] bg-[var(--btn-bg)] px-5 text-[var(--btn-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
                <span className="font-[family-name:var(--f-mono)] text-sm font-semibold uppercase tracking-[var(--label-track)]">
                    {count} {count === 1 ? "item" : "items"} · {money(totalCents)}
                </span>
                <span className="flex items-center gap-1.5 font-semibold">
                    View order <ArrowRight size={18} aria-hidden />
                </span>
            </Link>
        </div>
    );
}
