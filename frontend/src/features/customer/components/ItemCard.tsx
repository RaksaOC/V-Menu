import { addToCart } from "../cart";
import { Plus } from "lucide-react";
import type { MenuItem } from "@vmenu/contracts";
import { formatMoney } from "@/lib/money";

interface CardProps {
    /** The restaurant and table whose cart the dish goes into (VM-05). */
    slug: string;
    table: string;
    _id: string;
    name: string;
    priceCents: number;
    image: string;
}

export default function Card({ slug, table, _id, name, priceCents, image }: CardProps) {
    return (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:scale-[1.02] hover:border-emerald-200">
            {/* Image Container */}
            <div className="relative overflow-hidden">
                <img src={image} alt={name} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110" />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col justify-between h-[140px]">
                <div className="space-y-2">
                    <h4 className="text-lg font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors duration-200">
                        {name}
                    </h4>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{formatMoney(priceCents)}</span>
                    </div>
                </div>

                {/* Add to Cart Button */}
                <button
                    onClick={() => {
                        const item: MenuItem = {
                            _id,
                            image,
                            name,
                            priceCents,
                            isEnabled: true,
                        };

                        const cartItem = {
                            item,
                            quantity: 1,
                        };

                        addToCart(slug, table, cartItem);
                    }}
                    className=" text-sm mt-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold p-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                >
                    <Plus size={16} />
                    Add to Cart
                </button>
            </div>
        </div>
    );
}
