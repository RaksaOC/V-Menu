import {AlertCircle, Pencil} from "lucide-react";
import {useState} from "react";
import EditItemPopup from "./EditItemPopup.jsx";
import axios from "axios";

const SettingsMenuCard = ({id, name, price, image}) => {
    const [isEditing, setIsEditing] = useState(false);

    function handleOnClose() {
        setIsEditing(false);
    }

    async function handleOnSave(editedItem) {
        const response = await axios.put(`http://localhost:3002/menu/${editedItem.id}/edit`, editedItem);
        if (response.status === 200) {
            console.log(response);
        }
        setIsEditing(false);
        location.reload();
    }

    async function handleOnDelete(id) {
        const response = await axios.delete(`http://localhost:3002/menu/${id}/delete`);
        if (response.status === 200) {
            console.log(response);
        }
        setIsEditing(false);
        location.reload();
    }

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
                    <Pencil size={20} className="text-zinc-600 dark:text-white" onClick={() => setIsEditing(true)}/>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400">${price.toFixed(2)}</p>
            </div>
            {
                isEditing && <EditItemPopup id={id} name={name} price={price} image={image} onClose={handleOnClose}
                                            onSave={handleOnSave} onDelete={handleOnDelete}/>
            }
        </div>
    )
        ;
};

export default SettingsMenuCard;
