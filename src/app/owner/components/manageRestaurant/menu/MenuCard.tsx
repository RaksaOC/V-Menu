import {CheckCircle, Pencil, XCircle} from "lucide-react";
import {useContext, useState} from "react";
import EditItemPopup from "./EditItemPopup";
import {ItemOutput} from "@/app/shared/types/Item";
import api from "@/app/shared/lib/axios";
import {ResContext} from "@/app/owner/ResContext";

interface Props {
    id: string;
    name: string;
    image: string;
    price: number;
    isEnabled: boolean;
    onModified: () => void;
}

const MenuCard = ({id, name, price, image, isEnabled, onModified}: Props) => {
    const [isEditing, setIsEditing] = useState(false);
    const resSlug = useContext(ResContext)

    function handleOnClose() {
        setIsEditing(false);
    }

    async function handleOnSave(editedItem: ItemOutput) {
        const response = await api.put(`/api/owner/${resSlug}/menu/${editedItem._id}`, editedItem);
        if (response.status === 200) {
            console.log(response);
        }
        setIsEditing(false);
        onModified();
    }

    async function handleOnDelete(id: string) {
        const response = await api.delete(`/api/owner/${resSlug}/menu/${id}`);
        if (response.status === 200) {
            console.log(response);
        }
        setIsEditing(false);
        onModified();
    }

    return (
        <>
            <div
                className="relative w-full rounded-3xl border-2 border-gray-200 overflow-hidden bg-white shadow-md  hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* Image */}
                <img
                    src={image}
                    alt={name}
                    className="w-full h-48 object-cover"
                />

                {/* Name and Edit Icon */}
                <div className="p-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <Pencil size={18}/>
                    </button>
                </div>

                {/* Price */}
                <div className="px-4 pb-4">
                    <span className="text-xl font-bold text-emerald-600">${price.toFixed(2)}</span>
                </div>

                <div
                    className={`absolute top-2 right-2 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shadow-md transition-colors duration-300 ${
                        isEnabled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                    }`}
                >
                    {isEnabled ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                    {isEnabled ? "Enabled" : "Disabled"}
                </div>
            </div>
            {isEditing && (
                <EditItemPopup
                    id={id}
                    name={name}
                    price={price}
                    image={image}
                    onClose={handleOnClose}
                    onSave={handleOnSave}
                    onDelete={handleOnDelete}
                />
            )}
        </>

    );
};

export default MenuCard;
