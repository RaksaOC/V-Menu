import { useState } from "react";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { MoreVertical } from "lucide-react";

const MenuCard = ({ id, name, price, image }) => {
    const [enabled, setEnabled] = useState(true);

    const handleToggle = () => {
        setEnabled(!enabled);
        toast.info(`Item ${enabled ? "Disabled" : "Enabled"}!`, {
            position: "top-center",
            autoClose: 1000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "light",
        });
    };

    return (
        <div className="relative max-w-full rounded-2xl overflow-hidden shadow-md bg-white dark:bg-zinc-800 hover:scale-[1.02] transition-transform duration-300">
            <img className="w-full h-48 object-cover" src={image} alt={name} />

            <div className="p-4">
                {/* Flex container for name + icon */}
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{name}</h3>
                    <button className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700">
                        <MoreVertical size={20} className="text-zinc-600 dark:text-white" />
                    </button>
                </div>

                <p className="text-zinc-600 dark:text-zinc-400 mb-4">${price.toFixed(2)}</p>

                <button
                    onClick={handleToggle}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition duration-200 font-semibold cursor-pointer ${
                        enabled
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                >
                    {enabled ? "Enabled" : "Disabled"}
                </button>

            </div>
        </div>

    );
};

export default MenuCard;
