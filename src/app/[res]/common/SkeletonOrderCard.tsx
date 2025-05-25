'use client'
import React from "react";

function OrderCardSkeleton() {
    return (
        <div className="rounded-2xl overflow-hidden bg-none w-full p-4 animate-pulse">
            <div className="flex justify-between items-center mb-2">
                <div className="h-6 w-32 bg-zinc-300 dark:bg-zinc-700 rounded"></div>
                {/* Optional: order ID */}
                {/* <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-600 rounded"></div> */}
            </div>

            <div className="bg-none rounded-xl p-3 mb-4 border border-slate-500">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="m-4 border-b border-zinc-300 dark:border-zinc-600 last:border-none">
                        <div className="flex justify-between items-center mb-3">
                            <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
                            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                        </div>

                        {[...Array(2)].map((_, j) => (
                            <div key={j}
                                 className="flex items-center justify-between gap-2 py-2 border-b last:border-none border-zinc-200 dark:border-zinc-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-300 dark:bg-zinc-700 rounded"></div>
                                    <div>
                                        <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-700 rounded mb-1"></div>
                                        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-600 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-4 w-16 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="flex gap-3 mt-6">
                <div className="flex-1 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-xl"></div>
                <div className="flex-1 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-xl"></div>
            </div>
        </div>
    );
}

export default OrderCardSkeleton;
