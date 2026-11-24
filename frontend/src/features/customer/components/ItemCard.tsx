"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { MenuItem } from "@vmenu/contracts";
import { DishTags } from "@/components/ui";
import { useMoney } from "@/components/money/MoneyProvider";
import { addToCart } from "../cart";

// A description longer than this is folded to three lines, with a "More" button.
const LONG_DESCRIPTION = 90;

interface CardProps {
    /** The restaurant and table whose cart the dish goes into (VM-05). */
    slug: string;
    table: string;
    _id: string;
    name: string;
    priceCents: number;
    image: string;
    /** VM-26: optional details. */
    description?: string;
    tags?: string[];
    /** VM-26: switched off by the staff: shown greyed, and it can't be added. */
    soldOut?: boolean;
}

/** One dish on the menu (VM-33): a 4:3 photo, the name, the price in mono, and one round + button. */
export default function Card({ slug, table, _id, name, priceCents, image, description, tags, soldOut = false }: CardProps) {
    const [expanded, setExpanded] = useState(false);
    const money = useMoney(); // VM-24: prices in the restaurant's currency

    function add() {
        const item: MenuItem = { _id, image, name, priceCents, isEnabled: true };
        addToCart(slug, table, { item, quantity: 1 });
    }

    return (
        <article
            data-sold-out={soldOut ? "true" : undefined}
            className="flex h-full flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]"
        >
            <div className="relative">
                <img
                    src={image}
                    alt={name}
                    loading="lazy"
                    className={`aspect-[4/3] w-full object-cover ${soldOut ? "opacity-60 grayscale" : ""}`}
                />
                {soldOut && (
                    <span className="absolute left-3 top-3 rounded-[var(--r-chip)] bg-[var(--ink)] px-2 py-1 font-[family-name:var(--f-label)] text-xs font-semibold tracking-[var(--label-track)] text-[var(--bg)]">
                        SOLD OUT
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                    <h4
                        className={`min-w-0 break-words text-base font-semibold leading-snug line-clamp-2 ${soldOut ? "text-[var(--muted)]" : "text-[var(--ink)]"}`}
                    >
                        {name}
                    </h4>
                    <span
                        className={`shrink-0 font-[family-name:var(--f-mono)] text-sm font-semibold ${soldOut ? "text-[var(--muted)]" : "text-[var(--ink)]"}`}
                    >
                        {money(priceCents)}
                    </span>
                </div>
                {description && (
                    <div>
                        <p data-dish-description className={`text-sm text-[var(--muted)] ${expanded ? "" : "line-clamp-3"}`}>
                            {description}
                        </p>
                        {description.length > LONG_DESCRIPTION && (
                            <button
                                type="button"
                                aria-expanded={expanded}
                                aria-label={`${expanded ? "Show less about" : "Read more about"} ${name}`}
                                onClick={() => setExpanded((open) => !open)}
                                className="mt-1 min-h-11 text-sm font-medium text-[var(--accent-text)] underline"
                            >
                                {expanded ? "Less" : "More"}
                            </button>
                        )}
                    </div>
                )}
                <DishTags tags={tags} />

                {/* a sold-out dish has no button (VM-26) */}
                {!soldOut && (
                    <button
                        type="button"
                        onClick={add}
                        aria-label={`Add to cart: ${name}`}
                        className="mt-auto flex h-11 w-11 items-center justify-center self-end rounded-full bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
                    >
                        <Plus size={20} aria-hidden />
                    </button>
                )}
            </div>
        </article>
    );
}
