'use client';

import React, {useState} from "react";
import {CartItem} from "@/app/shared/types/CartItem";
import {prettyDate} from "@/app/shared/util/formatter";
import {Clock, CheckCircle2, Users, Hash} from "lucide-react";

interface CardProps {
    orderId: string;
    table: string;
    orderedItems: CartItem[];
    isDone: boolean;
    onDone: (orderId: string) => void;
    orderedAt: string;
}

const Card = ({ orderId, table, orderedItems, isDone, onDone, orderedAt }: CardProps) => {
    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async () => {
        setIsCompleting(true);
        await onDone(orderId);
        setIsCompleting(false);
    };

    const totalItems = orderedItems.reduce((sum, item) => sum + item.quantity, 0);
    const orderTime = new Date(orderedAt);
    const timeAgo = Math.floor((Date.now() - orderTime.getTime()) / (1000 * 60));

    return (
        <div className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group w-full">
            {/* Order Header */}
            <div className="bg-gradient-to-r from-slate-600 to-gray-600 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                            <Users size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">Table {table}</h3>
                            <p className="text-slate-200 text-sm">Order #{orderId.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock size={16} className="text-slate-300" />
                            <span className="text-sm text-slate-200">{prettyDate(orderedAt)}</span>
                        </div>
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            timeAgo < 5 ? 'bg-green-500/20 text-green-200' :
                                timeAgo < 15 ? 'bg-yellow-500/20 text-yellow-200' :
                                    'bg-red-500/20 text-red-200'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${
                                timeAgo < 5 ? 'bg-green-400' :
                                    timeAgo < 15 ? 'bg-yellow-400' :
                                        'bg-red-400'
                            } animate-pulse`}></div>
                            {timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-slate-200">
                    <div className="flex items-center gap-2">
                        <Hash size={16} />
                        <span className="text-sm font-medium">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            {/* Order Items */}
            <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-slate-500 to-gray-500 rounded-full"></div>
                    Order Details
                </h4>

                <div className="space-y-3">
                    {orderedItems.map((orderedItem, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors duration-200 border border-gray-100"
                        >
                            <div className="flex-shrink-0">
                                <img
                                    src={orderedItem.item.image}
                                    alt={orderedItem.item.name}
                                    className="w-16 h-16 object-cover rounded-xl shadow-sm"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-gray-800 truncate mb-1">
                                    {orderedItem.item.name}
                                </h5>
                                <p className="text-sm text-gray-500">
                                    ${orderedItem.item.price.toFixed(2)} each
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="bg-slate-600 text-white px-3 py-1.5 rounded-full font-bold text-sm min-w-[3rem] text-center">
                                    ×{orderedItem.quantity}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Button */}
            {!isDone && (
                <div className="p-6 pt-0">
                    <button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isCompleting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Completing Order...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={22} />
                                Mark as Complete
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Card;