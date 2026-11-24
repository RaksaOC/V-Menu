import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, ChefHat, Clock, History } from "lucide-react";
import KitchenSignOut from "./KitchenSignOut";

/** The big kitchen header: title, counts, a link to the history, and the controls. */
export default function KitchenHeader({ slug, totalOrders, controls }: { slug: string; totalOrders: number; controls: ReactNode }) {
    return (
        <header className="relative bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 text-white overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-black/5">
                <div
                    className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}
                ></div>
            </div>
            <div className="relative px-6 py-8">
                <div className="max-w-6xl mx-auto">
                    <KitchenSignOut slug={slug} />
                    <div className="text-center mb-6">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="p-3 bg-white/15 rounded-full backdrop-blur-sm">
                                <ChefHat size={32} className="text-white" />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight">Kitchen Dashboard</h1>
                        </div>
                        <p className="text-slate-200 text-lg">Monitor and manage incoming orders</p>
                    </div>

                    {/* Kitchen Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Clock size={20} className="text-orange-300" />
                                <span className="text-orange-300 font-semibold">Active Orders</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{totalOrders}</p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Bell size={20} className="text-blue-300" />
                                <span className="text-blue-300 font-semibold">Status</span>
                            </div>
                            <p className="text-lg font-semibold text-white">{totalOrders > 0 ? "Active" : "Standby"}</p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20 flex items-center justify-center">
                            <Link href={`/${slug}/kitchen/history`}>
                                <button className="flex items-center justify-center gap-2 w-full text-white hover:text-slate-200 transition-colors">
                                    <History size={20} />
                                    <span className="font-semibold">View History</span>
                                </button>
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6">{controls}</div>
                </div>
            </div>
        </header>
    );
}
