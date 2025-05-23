'use client';

import ItemCard from "@/app/[res]/customer/[table]/ItemCard";
import {ShoppingCart} from "lucide-react"
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
        if(!isChecked) return;
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
        <div className="customer min-h-[90vh] bg-white flex flex-col">
            {/* Header */}
            <header className="w-full py-4 shadow-sm border-b border-gray-200">
                <h1 className="text-center text-2xl font-semibold text-gray-800">V-Menu Customer</h1>
            </header>

            {/* Item Grid */}
            <main className="flex-1 w-full max-w-[1024px] mx-auto px-4 sm:px-6 py-6 mb-20">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {isLoading ? (
                        Array.from({length: 6}).map((_, index) => (
                            <SkeletonMenuCard key={index}/>
                        ))
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
                        <p className="text-gray-500 col-span-full text-center">No data available.</p>
                    )}
                </div>
            </main>

            {/* Fixed Cart Bar */}
            <div
                className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 flex justify-between items-center z-50">
                <ShoppingCart size={20} className="text-black"/>
                <Link href={`/${resSlug}/customer/${table}/cart`}>
                    <button
                        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-xl transition-colors">
                        View Cart
                    </button>
                </Link>
            </div>

            <ToastContainer/>
        </div>
    );
}
