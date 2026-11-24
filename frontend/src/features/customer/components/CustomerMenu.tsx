"use client";

import ItemCard from "@/features/customer/components/ItemCard";
import { ShoppingCart, Store, Utensils } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ToastHost } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { apiErrorCode } from "@/lib/api";
import TableProblem, { type TableProblemKind } from "@/features/customer/components/TableProblem";
import { checkTable, getMenu } from "@/features/customer/api";
import { reconcileCart } from "@/features/customer/cart";
import { toast } from "@/lib/toast";
import type { MenuItem } from "@vmenu/contracts";

export default function CustomerPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [problem, setProblem] = useState<TableProblemKind | null>(null);
    const params = useParams();
    const table = String(params.table ?? "");
    const resSlug = String(params.res ?? "");

    // VM-04: check the table, then load the menu. Every failure is explained on this page
    // (closed table, unknown restaurant or table, or a server error with Try again).
    const load = useCallback(async () => {
        setIsLoading(true);
        setProblem(null);
        try {
            await checkTable(resSlug, table);
            const menu = await getMenu(resSlug);
            setItems(menu);
            // VM-05: dishes taken off the menu since they were added leave the cart.
            const dropped = reconcileCart(resSlug, table, menu);
            if (dropped)
                toast.info(
                    `${dropped} ${dropped === 1 ? "item is" : "items are"} no longer available and ${dropped === 1 ? "was" : "were"} removed from your cart.`,
                );
        } catch (error) {
            const code = apiErrorCode(error);
            setProblem(
                code === "TABLE_CLOSED"
                    ? "closed"
                    : code === "RESTAURANT_NOT_FOUND"
                      ? "no-restaurant"
                      : code === "TABLE_NOT_FOUND"
                        ? "no-table"
                        : "error",
            );
        } finally {
            setIsLoading(false);
        }
    }, [resSlug, table]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <>
            <ToastHost />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                {/* Enhanced Header with Gradient Background */}
                <header className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-black/5">
                        <div
                            className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}
                        ></div>
                    </div>
                    <div className="relative px-6 py-8">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                    <Utensils size={24} className="text-white" />
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight">{params.res}</h1>
                            </div>
                            <p className="text-emerald-100 text-lg font-medium">Table {table}</p>
                            <p className="text-emerald-50/80 text-sm mt-1">Browse our delicious menu and order with ease</p>
                        </div>
                    </div>

                    {/*/!* Bottom Wave *!/*/}
                    {/*<div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">*/}
                    {/*    <svg className="relative block w-full h-6" viewBox="0 0 1200 120" preserveAspectRatio="none">*/}
                    {/*        <path*/}
                    {/*            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"*/}
                    {/*            fill="rgb(248 250 252)">*/}
                    {/*        </path>*/}
                    {/*    </svg>*/}
                    {/*</div>*/}
                </header>

                {/* Main Content */}
                <main className="px-4 sm:px-6 py-8 pb-24">
                    <div className="max-w-6xl mx-auto">
                        {/* Section Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Our Menu</h2>
                            <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {problem ? (
                                <TableProblem kind={problem} table={table} onRetry={load} />
                            ) : isLoading ? (
                                <>
                                    <Skeleton variant="menu" count={3} className="contents" />
                                </>
                            ) : items.length > 0 ? (
                                items.map((item, index) => (
                                    <ItemCard
                                        key={index}
                                        slug={resSlug}
                                        table={table}
                                        _id={item._id}
                                        name={item.name}
                                        image={item.image}
                                        price={item.price}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="max-w-md mx-auto">
                                        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                                            <Store size={32} className="text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Items Available</h3>
                                        <p className="text-gray-500">Check back later for our delicious menu items.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Enhanced Fixed Cart Bar (hidden while the table can't take orders) */}
                {!problem && (
                    <div className="fixed bottom-0 left-0 right-0 z-50">
                        {/* Backdrop blur effect */}
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50"></div>

                        <div className="relative p-4">
                            <div className="max-w-6xl mx-auto flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-full">
                                        <ShoppingCart size={20} className="text-emerald-600" />
                                    </div>
                                    <span className="text-gray-700 font-medium">Your Order</span>
                                </div>

                                <Link href={`/${resSlug}/customer/${table}/cart`}>
                                    <button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95">
                                        View Cart
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
