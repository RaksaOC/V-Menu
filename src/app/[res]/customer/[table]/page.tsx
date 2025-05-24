'use client';

import ItemCard from "@/app/[res]/customer/[table]/ItemCard";
import {ShoppingCart, Store, Utensils} from "lucide-react"
import {ItemOutput} from "@/app/shared/types/Item";
import Link from "next/link";
import {useParams, useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import axios from "axios";
import {ToastContainer} from "react-toastify";
import SkeletonMenuCard from "@/app/[res]/common/SkeletonMenuCard";
import api from "@/app/shared/lib/axios";

export default function CustomerPage() {
    const [items, setItems] = useState<ItemOutput[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const params = useParams();
    const router = useRouter();
    const [isChecked, setChecked] = useState<boolean>(false);

    useEffect(() => {
        const checkTable = async () => {
            try {
                const response = await api.post(`/api/customer/${params.res}/availability`, {
                    table: params.table?.toString(),
                });
                setChecked(true);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    router.push(`/${params.res}/customer`);
                } else {
                    console.error("API error:", error);
                }
            }
        };

        checkTable();
    }, []);

    const table = params.table;
    const resSlug = params.res;

    useEffect(() => {
        if (!isChecked) return;
        localStorage.setItem("table", JSON.stringify(table));
        const fetchItems = async () => {
            try {
                const res = await axios.get(`/api/customer/${resSlug}`);
                const data = await res.data;
                setItems(data);
            } catch (err) {
                console.log(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, [isChecked]);

    return (
        <>
            <ToastContainer position={"top-center"}/>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                {/* Enhanced Header with Gradient Background */}
                <header
                    className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-black/5">
                        <div
                            className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}>
                        </div>
                    </div>
                    <div className="relative px-6 py-8">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                    <Utensils size={24} className="text-white"/>
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight">{params.res}</h1>
                            </div>
                            <p className="text-emerald-100 text-lg font-medium">Table {table}</p>
                            <p className="text-emerald-50/80 text-sm mt-1">Browse our delicious menu and order with
                                ease</p>
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

                {/* Main Content */
                }
                <main className="px-4 sm:px-6 py-8 pb-24">
                    <div className="max-w-6xl mx-auto">
                        {/* Section Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Our Menu</h2>
                            <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {isLoading ? (
                                <>
                                    <SkeletonMenuCard isLight={true}/>
                                    <SkeletonMenuCard isLight={true}/>
                                    <SkeletonMenuCard isLight={true}/>
                                </>
                            ) : items.length > 0 ? (
                                items.map((item, index) => (
                                    <ItemCard
                                        key={index}
                                        _id={item._id}
                                        name={item.name}
                                        image={item.image}
                                        price={item.price}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="max-w-md mx-auto">
                                        <div
                                            className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                                            <Store size={32} className="text-gray-400"/>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Items Available</h3>
                                        <p className="text-gray-500">Check back later for our delicious menu items.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Enhanced Fixed Cart Bar */
                }
                <div className="fixed bottom-0 left-0 right-0 z-50">
                    {/* Backdrop blur effect */}
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50"></div>

                    <div className="relative p-4">
                        <div className="max-w-6xl mx-auto flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-full">
                                    <ShoppingCart size={20} className="text-emerald-600"/>
                                </div>
                                <span className="text-gray-700 font-medium">Your Order</span>
                            </div>

                            <Link href={`/${resSlug}/customer/${table}/cart`}>
                                <button
                                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95">
                                    View Cart
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )

}