'use client';

import ItemCard from "@/app/[res]/customer/[table]/ItemCard";
import {ShoppingCart} from "lucide-react"
import {ItemOutput} from "@/app/shared/types/Item";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect, useState} from "react";
import axios from "axios";

export default function CustomerPage() {
    const [items, setItems] = useState<ItemOutput[]>([]);
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await axios.get("/api/customer");
                const data = await res.data;
                setItems(data.filter((item: ItemOutput) => item.isEnabled));
            } catch (err) {
                console.log(err);
            }
        }
        fetchItems();
    }, []);

    const params = useParams()
    const table = params.table;
    localStorage.setItem("table", JSON.stringify(table));

    console.log("I'm at ", table);

    return (
        <>
            <header className="header p-2.5">
                <p className="text-center text-black text-3xl">V-Menu Customer</p>
            </header>
            <div
                className="container max-w-[1024px] mx-auto p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-24 ">
                {
                    items.map((item, index) => (
                        <ItemCard key={index} _id={item._id} name={item.name} image={item.image} price={item.price}/>
                    ))
                }
            </div>

            {/* Bottom fixed cart bar */}
            <div
                className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 flex items-center justify-between p-4">
                <ShoppingCart size={50} color={"#000000"} />
                <Link href={``}>
                    <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl">
                        View Cart
                    </button>
                </Link>
            </div>
        </>
    )
}
