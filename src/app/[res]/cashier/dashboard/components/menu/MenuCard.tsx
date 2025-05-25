import {useEffect, useState} from "react";
import {toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {MoreVertical, DollarSign, Eye, EyeOff} from "lucide-react";
import axios from "axios";

interface Props {
    id: string;
    name: string;
    price: number;
    image: string;
    isEnabled: boolean;
    onToggle: (id: string) => void;
}

const MenuCard = ({id, name, price, image, isEnabled, onToggle}: Props) => {
    const [enabled, setEnabled] = useState(isEnabled);

    const handleToggle = () => {
        setEnabled(!enabled);
        toast.info(`${name} ${enabled ? "Disabled" : "Enabled"}!`, {
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
        <div className={`relative bg-none rounded-2xl border  border-slate-500 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-1 ${
            !enabled ? "opacity-75" : ""
        }`}>
            {/* Status Indicator */}
            <div className={`absolute top-4 right-4 z-10 w-3 h-3 rounded-full ${
                enabled ? "bg-green-400" : "bg-red-400"
            }`}></div>

            {/* Image */}
            <div className="relative overflow-hidden">
                <img
                    src={image}
                    alt={name}
                    className={`w-full h-44 object-cover transition-all duration-300 ${
                        !enabled ? "grayscale" : "hover:scale-105"
                    }`}
                />
                {!enabled && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Disabled
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight">
                        {name}
                    </h3>
                </div>

                {/* Price */}
                <div className="flex items-center space-x-2 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                        <DollarSign size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xl font-bold text-slate-800 dark:text-white">
                        ${price.toFixed(2)}
                    </span>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => {
                        onToggle(id);
                        handleToggle();
                    }}
                    className={`w-full py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                        enabled
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30"
                            : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30"
                    }`}
                >
                    {enabled ? (
                        <>
                            <Eye size={16} />
                            <span>Enabled</span>
                        </>
                    ) : (
                        <>
                            <EyeOff size={16} />
                            <span>Disabled</span>
                        </>
                    )}
                </button>
            </div>

            {/* Hover Effect Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
    );
};

export default MenuCard;