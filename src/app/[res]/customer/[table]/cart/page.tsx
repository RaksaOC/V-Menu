'use client'

import {useEffect, useState} from "react";
import {toast, ToastContainer} from "react-toastify"; // ✅ fixed import
import axios from "axios";
import CartItemCard from "@/app/[res]/customer/[table]/cart/CartItemCard";
import {CartItem} from "@/app/shared/types/CartItem";
import {OrderInput} from "@/app/shared/types/Order";
import {useRouter} from "next/navigation";

export default function CartPage() {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    useEffect(() => {
        const savedCart = localStorage.getItem("cartItems");
        if (savedCart) {
            setCartItems(JSON.parse(savedCart));
        }
    }, []);

    const updateCart = (updatedItems: CartItem[]) => {
        setCartItems(updatedItems);
        localStorage.setItem("cartItems", JSON.stringify(updatedItems));
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
    };

    const total = cartItems.reduce((sum, item) => sum + item.item.price * item.quantity, 0);

    const placeOrder = async () => {
        if (!cartItems.length) {
            toast.error("No items in cart!", {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: false,
                theme: "light",
            });
            return;
        }

        try {
            const orderToAdd: OrderInput = {
                isDone: false,
                orderedItems: cartItems,
            }
            await axios.post("/api/customer", orderToAdd);

            toast.success("Order has been placed!", {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: false,
                theme: "light",
            });

            setTimeout(() => {
                setCartItems([]);
                localStorage.removeItem("cartItems");
                router.back();
            }, 1000);

        } catch (error) {
            console.error("Order failed:", error);
            toast.error("Failed to place order.", {
                position: "top-center",
                autoClose: 1000,
                theme: "light",
            });
        }
    };

    return (
        <div className="relative min-h-screen p-4 pb-32 bg-gray-100 flex flex-col justify-start items-center">
            <div className="header-wrapper w-full">
                <div className="header justify-between flex flex-row w-full items-center md:max-w-[50%]">
                    <button
                        onClick={() => router.back()}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl h-[40px]"
                    >
                        Go Back
                    </button>
                    <h1 className="text-2xl font-bold text-center mb-0">Your Cart</h1>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-[98%] mt-14">
                {cartItems.length > 0 ? (
                    cartItems.map((cartItem, index) => (
                        <CartItemCard
                            key={index}
                            cartItem={cartItem}
                            index={index}
                            increaseQuantity={increaseQuantity}
                            decreaseQuantity={decreaseQuantity}
                            removeItem={removeItem}
                        />
                    ))
                ) : (
                    <h1 className="mt-[40vh] text-4xl text-center">Cart is Empty</h1>
                )}
            </div>

            {/* Fixed bottom bar */}
            <div
                className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 flex items-center justify-between p-4">
                <div className="text-lg font-bold">
                    Total: ${total.toFixed(2)}
                </div>
                <button
                    onClick={placeOrder}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl"
                >
                    Place Order
                </button>
            </div>
            <ToastContainer></ToastContainer>
        </div>
    );
}
