import { ShoppingBag } from "lucide-react";

/** "Your cart is empty", with a way back to the menu. */
export default function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
    return (
        <div className="text-center py-20">
            <div className="max-w-md mx-auto">
                <div className="p-6 bg-gray-100 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                    <ShoppingBag size={48} className="text-gray-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-700 mb-3">Your cart is empty</h2>
                <p className="text-gray-500 mb-6">Start adding some delicious items to your order!</p>
                <button
                    onClick={onBrowse}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                >
                    Browse Menu
                </button>
            </div>
        </div>
    );
}
