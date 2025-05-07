import { QrCode, Pencil } from "lucide-react";
import {useState} from "react";
import EditTablePopup from "./EditTablePopup";
import axios from "axios";
import EditItemPopup from "./EditItemPopup.jsx";

function SettingsTableCard({ table}) {
    const [isEditing, setIsEditing] = useState(false);


    async function handleOnSave(id, name) {
        const editedTable = {
            name: name,
        }

        try {
            const response = await axios.put(`http://localhost:3002/tables/${id}/edit`, editedTable);
            if (response.status === 200) {
                console.log("Table updated:", response.data);
                setIsEditing(false);
                location.reload();
            }
        } catch (error) {
            if (error.response?.status === 409) {
                console.log("Table name is taken");
                setIsEditing(true);
                return "taken"
            } else {
                console.error("Unexpected error:", error);
                return "error"
            }
        }
    }

    async function handleOnCancel() {
        setIsEditing(false);
    }

    async function handleOnDelete(id) {
        const response = await axios.delete(`http://localhost:3002/tables/${id}/delete`);
        if (response.status === 200) {
            console.log(response);
        }
        setIsEditing(false);
        location.reload();
    }

    return (
        <div className="p-4 flex justify-center w-full md:max-w-[300px]">
            <div className="min-h-[250px] w-full p-4 rounded-lg border text-center flex flex-col justify-between border-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                <div>
                    <div className="text-xl font-bold">Table {table.id}</div>
                </div>

                <div className="mt-4 space-y-2">
                    <button
                        className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 bg-white text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-100 dark:hover:bg-zinc-200 rounded-lg"
                        onClick={() => setIsEditing(true)}
                    >
                        <Pencil size={16}  />
                        Edit
                    </button>

                    <button
                        className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg"
                    >
                        <QrCode size={16} />
                        View QR
                    </button>
                </div>
            </div>
            {
                isEditing && <EditTablePopup  id={table._id} name={table.id} onClose={handleOnCancel} onSave={handleOnSave} onDelete={handleOnDelete}  />
            }
        </div>
    );
}

export default SettingsTableCard;
