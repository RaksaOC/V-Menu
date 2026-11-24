import "react-toastify/dist/ReactToastify.css";
import type { MenuItem, PlaceOrderBody } from "@vmenu/contracts";
import { toCents } from "@/lib/money";
import { toast } from "@/lib/toast";

/** A line in the cart: a dish as the menu showed it, how many, and the customer's note (VM-28). */
export type CartItem = { item: MenuItem; quantity: number; note?: string };

/** VM-22: the most lines one order can have (the same as MAX_ORDER_LINES in @vmenu/contracts). */
export const MAX_ORDER_LINES = 50;
/** VM-28: the longest notes, the same as LINE_NOTE_MAX and ORDER_NOTE_MAX in @vmenu/contracts. */
export const LINE_NOTE_MAX = 100;
export const ORDER_NOTE_MAX = 200;

/** A note as the server will keep it: one space between words, trimmed; empty is no note. */
const cleanNote = (note?: string) => note?.replace(/\s+/g, " ").trim() || undefined;

/** What the cart sends: the dish ids, quantities and notes; menu-service supplies the names and prices. */
export function toOrderBody(table: { token: string | null; name: string }, items: CartItem[], orderNote?: string): PlaceOrderBody {
    const note = cleanNote(orderNote);
    const orderedItems = items.map((l) => {
        const lineNote = cleanNote(l.note);
        return { item: { _id: l.item._id }, quantity: l.quantity, ...(lineNote && { note: lineNote }) };
    });
    // SEC-04: the link token, never the table's name; the name only on the old pages
    const where = table.token ? { qrToken: table.token } : { table: table.name };
    return { ...where, orderedItems, ...(note && { note }) };
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

/** CL-07: a cart saved before prices were in cents has `price` in dollars. */
function inCents(line: CartItem & { item: { price?: number } }): CartItem {
    if (line.item?.priceCents !== undefined) return line;
    return { ...line, item: { ...line.item, priceCents: toCents(line.item?.price ?? 0) } };
}

export function readCart(slug: string, table: string): CartItem[] {
    dropLegacyCart();
    try {
        const saved = JSON.parse(localStorage.getItem(cartKey(slug, table)) ?? "[]");
        return Array.isArray(saved) ? saved.map(inCents) : [];
    } catch {
        return [];
    }
}

export function saveCart(slug: string, table: string, items: CartItem[]): void {
    if (items.length) localStorage.setItem(cartKey(slug, table), JSON.stringify(items));
    else localStorage.removeItem(cartKey(slug, table));
}

export function clearCart(slug: string, table: string): void {
    localStorage.removeItem(cartKey(slug, table));
    localStorage.removeItem(orderNoteKey(slug, table));
}

/** VM-28: the note for the whole order, kept with the cart until the order is placed. */
const orderNoteKey = (slug: string, table: string) => `${cartKey(slug, table)}:note`;
export const readOrderNote = (slug: string, table: string) => localStorage.getItem(orderNoteKey(slug, table)) ?? "";
export function saveOrderNote(slug: string, table: string, note: string): void {
    if (note) localStorage.setItem(orderNoteKey(slug, table), note);
    else localStorage.removeItem(orderNoteKey(slug, table));
}

export function addToCart(slug: string, table: string, itemToAdd: CartItem): void {
    const items = readCart(slug, table);
    // VM-28: a line with a note is its own line ("no chilli"); the same dish again starts a plain one
    const existing = items.find((line) => line.item._id === itemToAdd.item._id && !cleanNote(line.note));
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
