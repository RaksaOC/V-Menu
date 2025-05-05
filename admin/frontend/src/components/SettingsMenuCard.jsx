import { Pencil } from "lucide-react";

const SettingsMenuCard = ({ id, name, price, image, onEdit }) => {
    return (
        <div
            className="w-full max-w-xs rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-300 m-2"
        >
            <img
                src={image}
                alt={name}
                className="w-full h-44 object-cover"
            />

            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{name}</h3>
                    <button
                        onClick={() => onEdit(id)}
                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        title="Edit"
                    >
                        <Pencil size={20} className="text-zinc-600 dark:text-white" />
                    </button>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400">${price.toFixed(2)}</p>
            </div>
        </div>
    );
};

export default SettingsMenuCard;
