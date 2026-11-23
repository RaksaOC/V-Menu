import { toast } from "@/lib/toast";
import "react-toastify/dist/ReactToastify.css";
import type { MenuItem, PlaceOrderBody } from "@vmenu/contracts";

/** A line in the cart: a dish as the menu showed it, and how many. */
export type CartItem = { item: MenuItem; quantity: number };

/** VM-22: the most lines one order can have (the same as MAX_ORDER_LINES in @vmenu/contracts). */
export const MAX_ORDER_LINES = 50;

/** What the cart sends: the dish ids and quantities; menu-service supplies the names and prices. */
export function toOrderBody(table: string, items: CartItem[]): PlaceOrderBody {
    return { table, orderedItems: items.map((l) => ({ item: { _id: l.item._id }, quantity: l.quantity })) };
}

// The customer's cart, kept in localStorage until the order is placed.
// VM-05: one cart per restaurant and table, so a cart never leaks into another restaurant or
// table, and two tabs on different tables keep their own orders.

export const cartKey = (slug: string, table: string) => `cart:${slug}:${table}`;

// Before VM-05 every restaurant and table shared these two keys; whatever is left is dropped.
function dropLegacyCart() {
    localStorage.removeItem("cartItems");
    localStorage.removeItem("table");
}

export function readCart(slug: string, table: string): CartItem[] {
    dropLegacyCart();
    try {
        const saved = JSON.parse(localStorage.getItem(cartKey(slug, table)) ?? "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

export function saveCart(slug: string, table: string, items: CartItem[]): void {
    if (items.length) localStorage.setItem(cartKey(slug, table), JSON.stringify(items));
    else localStorage.removeItem(cartKey(slug, table));
}

export const clearCart = (slug: string, table: string) => localStorage.removeItem(cartKey(slug, table));

export function addToCart(slug: string, table: string, itemToAdd: CartItem): void {
    const items = readCart(slug, table);
    const existing = items.find((line) => line.item._id === itemToAdd.item._id);
    if (existing) {
        existing.quantity += 1;
        toast.success("Added to existing item!");
    } else {
        items.push(itemToAdd);
        toast.success("Added to cart! 🛒");
    }
    saveCart(slug, table, items);
}

/**
 * Brings the cart in line with the menu that was just loaded: lines whose dish is no longer on it
 * are dropped, and the others get the menu's current name, price and photo.
 * Returns how many lines were dropped, so the page can tell the customer.
 */
export function reconcileCart(slug: string, table: string, menu: MenuItem[]): number {
    const items = readCart(slug, table);
    const byId = new Map(menu.map((item) => [item._id, item]));
    const kept = items.filter((line) => byId.has(line.item._id)).map((line) => ({ ...line, item: byId.get(line.item._id)! }));
    if (kept.length !== items.length || JSON.stringify(kept) !== JSON.stringify(items)) saveCart(slug, table, kept);
    return items.length - kept.length;
}
