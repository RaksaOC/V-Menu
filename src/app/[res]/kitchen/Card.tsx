'use client';

import React from "react";
import {Item} from "@/app/shared/types/Item";
import {CartItem} from "@/app/shared/types/CartItem";

interface CardProps {
    orderId: string;
    table: string;
    orderedItems: CartItem[];
    isDone: boolean;
    onDone: (orderId: string) => void;
}

const Card = ({ orderId, table, orderedItems, isDone, onDone }: CardProps) => {
    return (
        <div className="max-w-[1024px] w-[98%] rounded-2xl overflow-hidden shadow-lg bg-white p-4 my-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800">Table {table}</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
                {orderedItems.map((orderedItem, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between gap-2 border-b last:border-none py-2"
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={orderedItem.item.image}
                                alt={orderedItem.item.name}
                                className="w-10 h-10 object-cover rounded"
                            />
                            <span className="text-gray-800">{orderedItem.item.name}</span>
                        </div>
                        <p className="text-m font-bold text-gray-600">x{orderedItem.quantity}</p>
                    </div>
                ))}
            </div>
            {!isDone && (
                <button
                    onClick={() => {
                        onDone(orderId);
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
                >
                    Mark as Done
                </button>
            )}
        </div>
    );
};

export default Card;
