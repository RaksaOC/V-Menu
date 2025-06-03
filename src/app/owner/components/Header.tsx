import {AnimatePresence, motion} from "framer-motion";
import {Bell, User, UtensilsCrossed, Menu as MenuIcon, X, Menu as LucideMenu, LogOut} from "lucide-react";
import React from "react";
import {Menu, MenuButton, MenuItem, MenuItems} from "@headlessui/react";
import Link from "next/link";

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
                        <p className="text-sm text-gray-500 hidden sm:block">Manage your restaurants</p>
                    </div>
                </div>

                {/* Right section: Notifications, user, and hamburger */}
                <div className="flex items-center space-x-4">
                    {/* Notifications */}
                    {/*<button className="relative p-2 rounded-xl bg-black/20 border border-white/10 hover:bg-black/30 transition-all duration-200">*/}
                    {/*    <Bell size={18} className="text-gray-300" />*/}
                    {/*    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>*/}
                    {/*</button>*/}

                    {/* User Profile & Menu */}
                    <Menu as="div" className="relative">
                        <MenuButton
                            className="flex items-center space-x-3 bg-white rounded-xl px-4 py-2 border border-slate-200 transition-all duration-200">
                            <div
                                className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                                <User size={16} className="text-white"/>
                            </div>
                            <div className="hidden sm:block text-left">
                                <div className="text-black text-sm font-medium">Owner</div>
                                <div className="text-gray-400 text-xs truncate max-w-32">
                                    owner@gmail.com
                                </div>
                            </div>
                            <LucideMenu size={18} className="text-black"/>
                        </MenuButton>

                        <MenuItems
                            className="absolute right-0 mt-3 w-56 origin-top-right rounded-xl bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200 focus:outline-none z-50 overflow-hidden">
                            <div className="py-2">
                                <div className="px-4 py-3">
                                    <p className="text-sm font-medium text-gray-900">Signed in as</p>
                                    <p className="text-sm text-gray-600 truncate">owner@gmail.com</p>
                                </div>

                                <div className="border-t border-gray-200 mt-2">
                                    <MenuItem>
                                        {({active}) => (
                                            <Link href={`/owner/login`}
                                                  onClick={() => {
                                                  }}
                                                  className={`${
                                                      active ? 'bg-red-50 text-red-700' : 'text-red-600'
                                                  } group flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150`}
                                            >
                                                <LogOut size={16} className="mr-3"/>
                                                Sign Out
                                            </Link>
                                        )}
                                    </MenuItem>
                                </div>
                            </div>
                        </MenuItems>
                    </Menu>
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