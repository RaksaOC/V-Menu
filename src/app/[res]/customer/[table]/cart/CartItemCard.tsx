// components/CartItem.tsx
import React, {useState} from "react";
import {Trash} from "lucide-react";
import {CartItem} from "@/app/shared/types/CartItem";
import {ItemBase} from "@/app/shared/types/Item";

type CartItemProps = {
    cartItem: CartItem;
    index: number;
    increaseQuantity: (index: number) => void;
    decreaseQuantity: (index: number) => void;
    removeItem: (index: number) => void;
};

const CartItemCard = ({cartItem, index, increaseQuantity, decreaseQuantity, removeItem}: CartItemProps) => {
    // const [menuItem, setMenuItems] = useState<Item>(item.item);
    const menuItem : ItemBase = (cartItem.item);
    return (
        <div
            key={index}
            className="bg-white rounded-xl shadow-md flex items-center p-4 gap-4 flex-wrap justify-center md:justify-between"
        >
            <img
                src={menuItem.image}
                alt={menuItem.name}
                className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-1/4">
                <h2 className="font-semibold text-s">{menuItem.name}</h2>
                <p className="text-gray-600">
                    ${Number(menuItem.price * cartItem.quantity).toFixed(2)}
                </p>
            </div>
            <div className="flex items-center gap-0.5">
                <button
                    onClick={() => decreaseQuantity(index)}
                    className="bg-gray-300 hover:bg-gray-400 text-black text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center"
                >
                    -
                </button>

                <span className="font-semibold text-base w-6 text-center">
          {cartItem.quantity}
        </span>

                <button
                    onClick={() => increaseQuantity(index)}
                    className="bg-gray-300 hover:bg-gray-400 text-black text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center"
                >
                    +
                </button>

                <button
                    onClick={() => removeItem(index)}
                    className="ml-2 w-6 h-6 flex items-center justify-center cursor-pointer"
                >
                    <Trash size={20} color={"red"} />
                </button>
            </div>
        </div>
    );
};

export default CartItemCard;
