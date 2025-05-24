import {toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {ItemInput, ItemOutput} from "@/app/shared/types/Item";
import {CartItem} from "@/app/shared/types/CartItem";
import {Plus} from "lucide-react";

export function addToCart(itemToAdd: CartItem): void {
    // Get existing items or fallback to empty array
    const storedCartItems = localStorage.getItem("cartItems");
    const allCartItems: CartItem[] = storedCartItems ? JSON.parse(storedCartItems) : [];

    // Check if item exists
    const existingItemIndex = allCartItems.findIndex(cartItem => cartItem.item._id === itemToAdd.item._id);

    if (existingItemIndex !== -1) {
        // Increment quantity
        allCartItems[existingItemIndex].quantity += 1;

        toast.success("Added to existing item!", {
            position: "top-center",
            autoClose: 1500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
            progressClassName: "!bg-gradient-to-r !from-emerald-500 !to-green-500",
        });
    } else {
        allCartItems.push(itemToAdd);

        toast.success("Added to cart! 🛒", {
            position: "top-center",
            autoClose: 1500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
            progressClassName: "!bg-gradient-to-r !from-emerald-500 !to-green-500",
        });
    }

    // Save updated items
    localStorage.setItem("cartItems", JSON.stringify(allCartItems));
    console.log(allCartItems);
}

interface CardProps {
    _id: string;
    name: string;
    price: number;
    image: string;
}

export default function Card({ _id, name, price, image }: CardProps) {
    return (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:scale-[1.02] hover:border-emerald-200">
            {/* Image Container */}
            <div className="relative overflow-hidden">
                <img
                    src={image}
                    alt={name}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col justify-between h-[140px]">
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors duration-200">
                        {name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-emerald-600">${price.toFixed(2)}</span>
                    </div>
                </div>

                {/* Add to Cart Button */}
                <button
                    onClick={() => {
                        const item: ItemOutput = {
                            _id,
                            image,
                            name,
                            price: parseInt(price.toFixed(2)),
                            isEnabled: true,
                        };

                        const cartItem = {
                            item,
                            quantity: 1,
                        };

                        addToCart(cartItem);
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