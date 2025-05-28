import {AnimatePresence, motion} from "framer-motion";
import {Bell, User, UtensilsCrossed, Menu as MenuIcon, X} from "lucide-react";
import React from "react";

interface Props {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    sidebarContent?: React.ReactNode;
    userInfo: {
        name: string;
        role: string;
    }
}

export default function Header({sidebarOpen, setSidebarOpen, sidebarContent, userInfo}: Props) {
    return (
        <>
            <header
                className="flex fixed items-center justify-between top-0 w-full bg-white border-b border-gray-200 p-4 z-10 shadow-sm">
                {/* Left section: Logo & Title */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 flex items-center justify-center rounded-xl border border-blue-100">
                        <UtensilsCrossed size={24} className="text-blue-600"/>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-blue-600">V-Menu Owner</h1>
                        <p className="text-sm text-gray-500 hidden sm:block">Manage Owned Restaurants</p>
                    </div>
                </div>

                {/* Right section: Notifications, user, and hamburger */}
                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <div className="relative p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                        <Bell size={20} className="text-gray-600"/>
                        <div
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            3
                        </div>
                    </div>

                    {/* User info */}
                    <div
                        className="hidden lg:flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="p-2 bg-blue-100 flex items-center justify-center rounded-lg">
                            <User size={20} className="text-blue-600"/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                            <p className="text-xs text-gray-500">{userInfo.role}</p>
                        </div>
                    </div>

                    {/* Hamburger Menu (moved here) */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? <X size={20}/> : <MenuIcon size={20}/>}
                    </button>
                </div>
            </header>


            {/* Your existing component with improved animations */}
            <AnimatePresence>
                {sidebarOpen && (
                    <div className="lg:hidden fixed inset-0 z-40 flex">
                        {/* Backdrop with fade animation */}
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            transition={{duration: 0.2}}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => setSidebarOpen(false)}
                        />

                        {/* Sidebar - slide in from right */}
                        <motion.div
                            initial={{x: '100%'}}
                            animate={{x: 0}}
                            exit={{x: '100%'}}
                            transition={{
                                type: 'tween',
                                duration: 0.3,
                                ease: [0.4, 0, 0.2, 1] // Custom easing for smooth feel
                            }}
                            className="ml-auto w-72 min-h-screen max-w-xs bg-white border-l border-gray-200 pt-4 pb-4 overflow-y-auto z-50"
                        >
                            {/* Close Button */}
                            <div className="px-6 flex justify-end">
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={24} className="text-gray-600"/>
                                </button>
                            </div>

                            {/* User Info */}
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div
                                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                    <div className="p-2 bg-blue-100 flex items-center justify-center rounded-lg">
                                        <User size={20} className="text-blue-600"/>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                                        <p className="text-xs text-gray-500">{userInfo.role}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Content */}
                            <div className="px-6 py-4 space-y-6 flex-1">
                                {sidebarContent}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </>
    );
};