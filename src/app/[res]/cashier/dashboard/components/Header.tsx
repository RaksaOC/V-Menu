import {Menu as LucideMenu, Settings, Users, UtensilsCrossed, LogOut, User, Bell, Clock} from "lucide-react";
import {Menu, MenuButton, MenuItem, MenuItems} from "@headlessui/react";
import Link from "next/link"
import {useParams} from "next/navigation";
import {useState, useEffect} from "react";

export default function Header() {
    const params = useParams();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Get user email from localStorage or wherever you store it
        // TODO: REMOVE and use api fetching
        const email = localStorage.getItem("userEmail") || "cashier@restaurant.com";
        setUserEmail(email);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div
            className="header w-full flex bg-slate-800  items-center justify-center sticky top-0 right-0 left-0 p-4 z-50 shadow-xl border-b border-slate-500/50">
            <div className="header-wrapper flex justify-between items-center  w-full">
                {/* Left Section - Branding */}
                <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg">
                        <UtensilsCrossed size={24} className="text-white"/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            V-Menu Cashier
                        </h1>
                        <p className="text-xs text-gray-300 capitalize">
                            {params.res}
                        </p>
                    </div>
                </div>

                {/* Middle Section - Time & Date */}
                <div
                    className="hidden md:flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                    <Clock size={16} className="text-purple-400"/>
                    <div className="text-center">
                        <div className="text-white font-semibold text-sm">
                            {formatTime(currentTime)}
                        </div>
                        <div className="text-gray-300 text-xs">
                            {formatDate(currentTime)}
                        </div>
                    </div>
                </div>

                {/* Right Section - User & Menu */}
                <div className="flex items-center space-x-4">
                    {/* Notifications */}
                    {/*<button className="relative p-2 rounded-xl bg-black/20 border border-white/10 hover:bg-black/30 transition-all duration-200">*/}
                    {/*    <Bell size={18} className="text-gray-300" />*/}
                    {/*    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>*/}
                    {/*</button>*/}

                    {/* User Profile & Menu */}
                    <Menu as="div" className="relative">
                        <MenuButton
                            className="flex items-center space-x-3 bg-black/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 hover:bg-black/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <div
                                className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User size={16} className="text-white"/>
                            </div>
                            <div className="hidden sm:block text-left">
                                <div className="text-white text-sm font-medium">Cashier</div>
                                <div className="text-gray-300 text-xs truncate max-w-32">
                                    {userEmail}
                                </div>
                            </div>
                            <LucideMenu size={18} className="text-gray-300"/>
                        </MenuButton>

                        <MenuItems
                            className="absolute right-0 mt-3 w-56 origin-top-right rounded-xl bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200 focus:outline-none z-50 overflow-hidden">
                            <div className="py-2">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <p className="text-sm font-medium text-gray-900">Signed in as</p>
                                    <p className="text-sm text-gray-600 truncate">{userEmail}</p>
                                </div>

                                <div className="border-t border-gray-200 mt-2">
                                    <MenuItem>
                                        {({active}) => (
                                            <Link href={`/${params.res}/cashier/login`}
                                                  onClick={() => {
                                                      localStorage.removeItem("token");
                                                      localStorage.removeItem("userEmail");
                                                      // TODO: api call to remove cookie
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
            </div>
        </div>
    );
}