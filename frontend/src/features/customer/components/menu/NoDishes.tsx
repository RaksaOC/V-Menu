import { Store } from "lucide-react";

/** "No Items Available": the restaurant has no dishes on its menu yet. */
export default function NoDishes() {
    return (
        <div className="col-span-full text-center py-12">
            <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Store size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Items Available</h3>
                <p className="text-gray-500">Check back later for our delicious menu items.</p>
            </div>
        </div>
    );
}
