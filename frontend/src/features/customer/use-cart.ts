"use client";

import { useEffect, useState } from "react";
import { CART_CHANGED, readCart, type CartItem } from "./cart";

/** VM-33: this table's cart, kept up to date as dishes are added here or in another tab. */
export function useCart(slug: string, table: string): CartItem[] {
    const [items, setItems] = useState<CartItem[]>([]);
    useEffect(() => {
        const read = () => setItems(readCart(slug, table));
        read();
        window.addEventListener(CART_CHANGED, read);
        window.addEventListener("storage", read); // another tab
        return () => {
            window.removeEventListener(CART_CHANGED, read);
            window.removeEventListener("storage", read);
        };
    }, [slug, table]);
    return items;
}
