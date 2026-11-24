"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ToastHost } from "@/components/ui";
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
            toast.error("No items in cart! 🛒");
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <CartHeader onBack={backToMenu} />

                <main className="px-4 sm:px-6 py-8 pb-32">
                    <div className="max-w-4xl mx-auto">
                        {cartItems.length > 0 ? (
                            <>
                                <CartSummary itemCount={itemCount} totalCents={totalCents} />

                                <div className="space-y-4">
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
                                </div>
                                <KitchenNote
                                    value={orderNote}
                                    onChange={(note) => {
                                        setOrderNote(note);
                                        saveOrderNote(slug, table, note);
                                    }}
                                />
                                <div className={"w-full flex justify-center items-center mt-6"}>
                                    <button
                                        onClick={backToMenu}
                                        className=" text-sm mt-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold p-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        <Plus size={16} />
                                        Add more
                                    </button>
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
