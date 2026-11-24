import Link from "next/link";
import { ShoppingCart } from "lucide-react";

/** The bar fixed at the bottom with "View Cart". */
export default function MenuCartBar({ cartHref }: { cartHref: string }) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50">
            {/* Backdrop blur effect */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50"></div>

            <div className="relative p-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-full">
                            <ShoppingCart size={20} className="text-emerald-600" />
                        </div>
                        <span className="text-gray-700 font-medium">Your Order</span>
                    </div>

                    <Link href={cartHref}>
                        <button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95">
                            View Cart
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
