import {useEffect, useState} from "react";
import {toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {MoreVertical} from "lucide-react";
import axios from "axios";

interface Props {
    id: string;
    name: string;
    price: number;
    image: string;
    isEnabled: boolean;
    onToggle: (id: string) => void;
}

const MenuCard = ({id, name, price, image, isEnabled, onToggle}:Props) => {
    const [enabled, setEnabled] = useState(isEnabled);

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
        <div
            className="w-full max-w-xs rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-300 m-2">
            <img
                src={image}
                alt={name}
                className="w-full h-44 object-cover"
            />

            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{name}</h3>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">${price.toFixed(2)}</p>

                <button
                    onClick={() => {
                        onToggle(id);
                        handleToggle()
                    }}
                    className={`w-full py-2 px-4 text-sm font-semibold rounded-xl transition-colors duration-200 ${
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
