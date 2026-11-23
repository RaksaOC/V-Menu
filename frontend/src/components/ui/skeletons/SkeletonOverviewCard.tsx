import React from "react";

export default function SkeletonOverviewCard() {
    return (
        <div
            className="card bg-zinc-700 shadow-md rounded-2xl p-6 gap-1 flex flex-row items-end animate-pulse">
            <div className="icon w-20 h-20 rounded-full flex items-center justify-center text-2xl mr-4 bg-gray-800" />
            <div className="text-content h-full flex flex-col justify-around flex-1">
                <div className="bg-gray-600 h-4 w-32 rounded mb-2" />
                <div className="bg-gray-500 h-8 w-20 rounded" />
            </div>
        </div>
    );
}
