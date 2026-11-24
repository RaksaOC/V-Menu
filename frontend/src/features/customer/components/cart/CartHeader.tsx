import { ArrowLeft, ShoppingBag } from "lucide-react";

/** The cart's header: Back to the menu, and the title. */
export default function CartHeader({ onBack }: { onBack: () => void }) {
    return (
        <header className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-black/5">
                <div
                    className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}
                ></div>
            </div>

            <div className="relative px-6 py-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between w-full">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>

                        <div className="text-right">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                    <ShoppingBag size={22} className="text-white" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight">Your Cart</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
