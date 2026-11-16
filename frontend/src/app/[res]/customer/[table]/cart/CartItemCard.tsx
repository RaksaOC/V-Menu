import React, {useState} from "react";
import {Minus, Plus, Trash2} from "lucide-react";
import {CartItem} from "@/app/shared/types/CartItem";
import {ItemBase} from "@/app/shared/types/Item";
import {toast, ToastContainer} from "react-toastify";

type CartItemProps = {
    cartItem: CartItem;
    index: number;
    increaseQuantity: (index: number) => void;
    decreaseQuantity: (index: number) => void;
    removeItem: (index: number) => void;
};

const CartItemCard = ({cartItem, index, increaseQuantity, decreaseQuantity, removeItem}: CartItemProps) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const menuItem: ItemBase = (cartItem.item);

    const handleRemove = () => {
        setIsRemoving(true);
        setTimeout(() => {
            removeItem(index);
            toast.info("Item removed!");
        }, 150);
    };

    return (
        <div
            className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group ${
                isRemoving ? 'scale-95 opacity-50' : ''
            }`}
        >
            <div className="p-5">
                <div className="flex items-center gap-4">
                    {/* Item Image */}
                    <div className="flex-shrink-0">
                        <img
                            src={menuItem.image}
                            alt={menuItem.name}
                            className="w-20 h-20 object-cover rounded-xl shadow-sm"
                        />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-800 mb-1 truncate">
                            {menuItem.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                ${menuItem.price.toFixed(2)} each
                            </span>
                            {/*<span className="text-xs text-gray-400">•</span>*/}
                            {/*<span className="text-sm font-medium text-emerald-600">*/}
                            {/*    ${(menuItem.price * cartItem.quantity).toFixed(2)} total*/}
                            {/*</span>*/}
                        </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-full p-1">
                            <button
                                onClick={() => decreaseQuantity(index)}
                                className="bg-zinc-200 hover:bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110 active:scale-95"
                            >
                                <Minus size={14}/>
                            </button>

                            <span className="font-bold text-lg w-8 text-center text-gray-800">
                                {cartItem.quantity}
                            </span>

                            <button
                                onClick={() => increaseQuantity(index)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110 active:scale-95"
                            >
                                <Plus size={14}/>
                            </button>
                        </div>

                        {/* Remove Button */}
                        <button
                            onClick={handleRemove}
                            className="bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-md transform hover:scale-110 active:scale-95 group"
                        >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform duration-200"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartItemCard;