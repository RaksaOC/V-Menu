"use client";

import { useState } from "react";
import { addToCart } from "../cart";
import { Plus } from "lucide-react";
import { DishTags } from "@/components/ui";
import type { MenuItem } from "@vmenu/contracts";
import { useMoney } from "@/components/money/MoneyProvider";

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

export default function Card({ slug, table, _id, name, priceCents, image, description, tags, soldOut = false }: CardProps) {
    const [expanded, setExpanded] = useState(false);
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    return (
        <article
            data-sold-out={soldOut ? "true" : undefined}
            className={`flex h-full flex-col overflow-hidden bg-white rounded-3xl shadow-sm border border-gray-100 group transition-all duration-300 ${soldOut ? "" : "hover:shadow-xl hover:scale-[1.02] hover:border-emerald-200"}`}
        >
            {/* Image Container */}
            <div className="relative overflow-hidden">
                <img
                    src={image}
                    alt={name}
                    className={`w-full h-48 object-cover transition-transform duration-300 ${soldOut ? "opacity-60 grayscale" : "group-hover:scale-110"}`}
                />
                {soldOut ? (
                    <span className="absolute left-3 top-3 rounded-[var(--r-chip)] bg-[var(--ink)] px-2 py-1 font-[family-name:var(--f-label)] text-xs font-semibold tracking-[var(--label-track)] text-[var(--bg)]">
                        SOLD OUT
                    </span>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col justify-between gap-3 p-5">
                <div className="space-y-2">
                    <h4
                        className={`text-lg font-bold line-clamp-2 leading-tight transition-colors duration-200 ${soldOut ? "text-gray-500" : "text-gray-800 group-hover:text-emerald-700"}`}
                    >
                        {name}
                    </h4>
                    {description && (
                        <div>
                            <p data-dish-description className={`text-sm text-gray-500 ${expanded ? "" : "line-clamp-3"}`}>
                                {description}
                            </p>
                            {description.length > LONG_DESCRIPTION && (
                                <button
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-label={`${expanded ? "Show less about" : "Read more about"} ${name}`}
                                    onClick={() => setExpanded((open) => !open)}
                                    className="mt-1 min-h-11 text-sm font-medium text-emerald-700 underline"
                                >
                                    {expanded ? "Less" : "More"}
                                </button>
                            )}
                        </div>
                    )}
                    <DishTags tags={tags} />
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${soldOut ? "text-gray-400" : "text-emerald-600"}`}>{money(priceCents)}</span>
                    </div>
                </div>

                {/* Add to Cart Button: a sold-out dish has none (VM-26) */}
                {!soldOut && (
                    <button
                        onClick={() => {
                            const item: MenuItem = {
                                _id,
                                image,
                                name,
                                priceCents,
                                isEnabled: true,
                            };

                            const cartItem = {
                                item,
                                quantity: 1,
                            };

                            addToCart(slug, table, cartItem);
                        }}
                        className=" text-sm mt-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold p-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                    >
                        <Plus size={16} />
                        Add to Cart
                    </button>
                )}
            </div>
        </article>
    );
}
