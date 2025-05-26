import {Bell, User, UtensilsCrossed} from "lucide-react";
import React from "react";

export default function Header() {
    return (
        <header
            className="flex fixed  items-center justify-between top-0 w-full bg-white border-b border-gray-200 p-4 z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 flex items-center justify-center rounded-xl border border-blue-100">
                    <UtensilsCrossed size={24} className="text-blue-600"/>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-blue-600">V-Menu Owner</h1>
                    <p className="text-sm text-gray-500">Manage Owned Restaurants</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                    <Bell size={20} className="text-gray-600"/>
                    <div
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        3
                    </div>
                </div>

                <div
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="p-2 bg-blue-100 flex items-center justify-center rounded-lg">
                        <User size={20} className="text-blue-600"/>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">John Doe</p>
                        <p className="text-xs text-gray-500">Owner</p>
                    </div>
                </div>
            </div>
        </header>
    );
};