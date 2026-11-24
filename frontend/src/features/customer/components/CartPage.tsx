"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, ToastHost } from "@/components/ui";
import { toast } from "@/lib/toast";
import { placeOrder as sendOrder } from "@/features/customer/api";
import { clearCart, MAX_ORDER_LINES, readCart, readOrderNote, saveCart, saveOrderNote, toOrderBody } from "@/features/customer/cart";
import { dropUnavailable } from "@/features/customer/unavailable";
import { apiErrorCode, apiErrorMessage, apiStatus } from "@/lib/api";
import CartItemCard from "@/features/customer/components/CartItemCard";
import { useTableLink } from "@/features/customer/table-link";
import type { CartItem } from "@/features/customer/cart";
import CartBottomBar from "./cart/CartBottomBar";
import CartHeader from "./cart/CartHeader";
import CartSummary from "./cart/CartSummary";
import EmptyCart from "./cart/EmptyCart";
import KitchenNote from "./cart/KitchenNote";

export default function CartPage() {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    // VM-06: why the last order failed, and whether trying again could help
    const [orderError, setOrderError] = useState<{ message: string; retry: boolean } | null>(null);
    // VM-05: this restaurant's and table's own cart; the order goes to the table in the URL.
    // SEC-04: by its link token; the table's name only on the old pages.
    const link = useTableLink();
    const { slug, cartId: table } = link;

    // VM-28: the customer's note for the whole order
    const [orderNote, setOrderNote] = useState("");

    useEffect(() => {
        setCartItems(readCart(slug, table));
        setOrderNote(readOrderNote(slug, table));
    }, [slug, table]);

    const setNote = (index: number, note: string) => {
        const updatedItems = [...cartItems];
        updatedItems[index] = { ...updatedItems[index], note };
        updateCart(updatedItems);
    };

    const updateCart = (updatedItems: CartItem[]) => {
        setCartItems(updatedItems);
        saveCart(slug, table, updatedItems);
    };

    const increaseQuantity = (index: number) => {
        const updatedItems = [...cartItems];
        updatedItems[index].quantity += 1;
        updateCart(updatedItems);
    };

    const decreaseQuantity = (index: number) => {
        const updatedItems = [...cartItems];
        if (updatedItems[index].quantity > 1) {
            updatedItems[index].quantity -= 1;
            updateCart(updatedItems);
        }
    };

    const removeItem = (index: number) => {
        const updatedItems = [...cartItems];
        updatedItems.splice(index, 1);
        updateCart(updatedItems);

        toast.info("Item removed from cart");
    };

    const totalCents = cartItems.reduce((sum, item) => sum + item.item.priceCents * item.quantity, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const placeOrder = async () => {
        setOrderError(null);
        if (!cartItems.length) {
            toast.error("Your cart is empty.");
            return;
        }

        if (cartItems.length > MAX_ORDER_LINES) {
            setOrderError({
                message: `An order can have at most ${MAX_ORDER_LINES} different dishes. Remove some, or place two orders.`,
                retry: false,
            });
            return;
        }

        setIsPlacingOrder(true);

        try {
            const order = await sendOrder(slug, toOrderBody(link, cartItems, orderNote));
            clearCart(slug, table); // straight away, so the same cart can't be sent twice
            setCartItems([]);
            setOrderNote("");
            // VM-07: the order's confirmation, with its number and the server's prices
            router.push(`${link.base}/orders/${order._id}`);
        } catch (error) {
            // VM-06: say why, and keep the cart. Dishes that went off the menu are taken out of it.
            const message = apiErrorMessage(error, "Couldn't place the order. Please try again.");
            if (apiErrorCode(error) === "ITEMS_UNAVAILABLE") {
                const { cart, advice } = await dropUnavailable(slug, table);
                if (cart) setCartItems(cart);
                setOrderError({ message: `${message}. ${advice}`, retry: false });
            } else {
                const status = apiStatus(error);
                setOrderError({ message, retry: status === undefined || status >= 500 });
            }
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const backToMenu = () => router.push(link.base);

    return (
        <>
            <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
                <CartHeader onBack={backToMenu} />

                <main className="px-4 pb-40 pt-6 sm:px-6">
                    <div className="mx-auto max-w-3xl">
                        {cartItems.length > 0 ? (
                            <>
                                <CartSummary itemCount={itemCount} totalCents={totalCents} />

                                <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                                    {cartItems.map((cartItem, index) => (
                                        <CartItemCard
                                            key={index}
                                            cartItem={cartItem}
                                            index={index}
                                            increaseQuantity={increaseQuantity}
                                            decreaseQuantity={decreaseQuantity}
                                            removeItem={removeItem}
                                            setNote={setNote}
                                        />
                                    ))}
                                </ul>
                                <KitchenNote
                                    value={orderNote}
                                    onChange={(note) => {
                                        setOrderNote(note);
                                        saveOrderNote(slug, table, note);
                                    }}
                                />
                                <div className="mt-6 flex justify-center">
                                    <Button
                                        variant="outline"
                                        className="min-h-11"
                                        icon={<Plus size={16} aria-hidden />}
                                        onClick={backToMenu}
                                    >
                                        Add more
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <EmptyCart onBrowse={backToMenu} />
                        )}
                    </div>
                </main>

                {(cartItems.length > 0 || orderError) && (
                    <CartBottomBar
                        orderError={orderError}
                        hasItems={cartItems.length > 0}
                        itemCount={itemCount}
                        totalCents={totalCents}
                        isPlacingOrder={isPlacingOrder}
                        placeOrder={placeOrder}
                    />
                )}

                <ToastHost />
            </div>
        </>
    );
}
