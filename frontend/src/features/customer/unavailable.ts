import { getMenu } from "@/features/customer/api";
import { readCart, reconcileCart, type CartItem } from "@/features/customer/cart";
import { orderableDishes } from "@/features/customer/menu";

/**
 * VM-06: after "items unavailable", reloads the menu, removes the dishes that are no longer on it
 * and says which. `cart` is the cart that's left, or null when the menu couldn't be loaded.
 */
export async function dropUnavailable(slug: string, table: string): Promise<{ cart: CartItem[] | null; advice: string }> {
    const before = readCart(slug, table);
    try {
        reconcileCart(slug, table, orderableDishes(await getMenu(slug)));
    } catch {
        return { cart: null, advice: "Check your cart and try again." };
    }
    const after = readCart(slug, table);
    const gone = before.filter((line) => !after.some((kept) => kept.item._id === line.item._id)).map((line) => line.item.name);
    return {
        cart: after,
        advice: gone.length
            ? `Removed from your cart: ${gone.join(", ")}. Check it and place the order again.`
            : "Check your cart and place the order again.",
    };
}
