'use client'

import {useEffect, useState} from "react";
import {toast, ToastContainer} from "react-toastify";
import axios from "axios";
import CartItemCard from "@/app/[res]/customer/[table]/cart/CartItemCard";
import {CartItem} from "@/app/shared/types/CartItem";
import {OrderInput} from "@/app/shared/types/Order";
import {useParams, useRouter} from "next/navigation";
import {ArrowLeft, ShoppingBag, Receipt, Plus} from "lucide-react";
import {ItemOutput} from "@/app/shared/types/Item";
import {addToCart} from "@/app/[res]/customer/[table]/ItemCard";

export default function CartPage() {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const params = useParams();

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

        toast.info("Item removed from cart", {
            position: "top-center",
            autoClose: 1500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
            progressClassName: "!bg-gradient-to-r !from-orange-500 !to-red-500",
        });
    };

    const total = cartItems.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const placeOrder = async () => {
        if (!cartItems.length) {
            toast.error("No items in cart! 🛒", {
                position: "top-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "light",
                className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
                progressClassName: "!bg-gradient-to-r !from-red-500 !to-pink-500",
            });
            return;
        }

        setIsPlacingOrder(true);

        try {
            const table: string = JSON.parse(localStorage.getItem("table") || "") || "";
            const orderToAdd: OrderInput = {
                table: table,
                isDone: false,
                orderedItems: cartItems,
            }
            await axios.post(`/api/customer/${params.res}`, orderToAdd);

            toast.success("Order placed successfully!", {
                position: "top-center",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "light",
                className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
                progressClassName: "!bg-gradient-to-r !from-emerald-500 !to-green-500",
            });

            setTimeout(() => {
                setCartItems([]);
                localStorage.removeItem("cartItems");
                router.back();
            }, 2000);

        } catch (error) {
            console.error("Order failed:", error);
            toast.error("Failed to place order. Please try again.", {
                position: "top-center",
                autoClose: 2000,
                theme: "light",
                className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
                progressClassName: "!bg-gradient-to-r !from-red-500 !to-pink-500",
            });
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                {/* Enhanced Header */}
                <header
                    className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-black/5">
                        <div
                            className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}>
                        </div>
                    </div>

                    <div className="relative px-6 py-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center justify-between w-full">
                                <button
                                    onClick={() => router.push(`/${params.res}/customer/${params.table}`)}
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                    <ArrowLeft size={18}/>
                                    Back
                                </button>

                                <div className="text-right">
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                            <ShoppingBag size={22} className="text-white"/>
                                        </div>
                                        <h1 className="text-2xl font-bold tracking-tight">Your Cart</h1>
                                    </div>
                                    {/*<p className="text-emerald-100 text-sm">Table {params.table}</p>*/}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */
                }
                <main className="px-4 sm:px-6 py-8 pb-32">
                    <div className="max-w-4xl mx-auto">
                        {cartItems.length > 0 ? (
                            <>
                                {/* Cart Summary */}
                                <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-full">
                                                <Receipt size={18} className="text-emerald-600"/>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-800">Order Summary</h3>
                                                <p className="text-sm text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''} in
                                                    your cart</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cart Items */}
                                <div className="space-y-4">
                                    {cartItems.map((cartItem, index) => (
                                        <CartItemCard
                                            key={index}
                                            cartItem={cartItem}
                                            index={index}
                                            increaseQuantity={increaseQuantity}
                                            decreaseQuantity={decreaseQuantity}
                                            removeItem={removeItem}
                                        />
                                    ))}
                                </div>
                                <div className={"w-full flex justify-center items-center mt-6"}>
                                    <button
                                        onClick={() => router.push(`/${params.res}/customer/${params.table}`)}
                                        className=" text-sm mt-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold p-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        <Plus size={16}/>
                                        Add more
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <div className="max-w-md mx-auto">
                                    <div
                                        className="p-6 bg-gray-100 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                                        <ShoppingBag size={48} className="text-gray-400"/>
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-700 mb-3">Your cart is empty</h2>
                                    <p className="text-gray-500 mb-6">Start adding some delicious items to your
                                        order!</p>
                                    <button
                                        onClick={() => router.push(`/${params.res}/customer/${params.table}`)}
                                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                    >
                                        Browse Menu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Enhanced Fixed Bottom Bar */
                }
                {
                    cartItems.length > 0 && (
                        <div className="fixed bottom-0 left-0 right-0 z-50">
                            {/* Backdrop blur effect */}
                            <div
                                className="absolute inset-0 bg-white/90 backdrop-blur-lg border-t border-gray-200/50"></div>

                            <div className="relative p-4">
                                <div className="max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-lg font-bold text-gray-800">Total: ${total.toFixed(2)}</p>
                                            <p className="text-sm text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                                        </div>
                                        <button
                                            onClick={placeOrder}
                                            disabled={isPlacingOrder}
                                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isPlacingOrder ? (
                                                <>
                                                    <div
                                                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Placing Order...
                                                </>
                                            ) : (
                                                <>
                                                    <Receipt size={18}/>
                                                    Place Order
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Enhanced Toast Container */
                }
                <ToastContainer
                    position="top-center"
                    autoClose={2000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                    toastClassName="!bg-white !text-gray-800 !shadow-xl !border !border-gray-100"
                    progressClassName="!bg-gradient-to-r !from-emerald-500 !to-green-500"
                />
            </div>
        </>
    )
}