import {useState} from "react";
import {X} from "lucide-react";

export default function EditTablePopup({id, name, onClose, onSave, onDelete}) {
    const [tableName, setTableName] = useState(name || "");
    const [touched, setTouched] = useState(false);
    const [isTaken, setIsTaken] = useState(false);

    const isSaveDisabled = tableName.trim() === "";

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg w-full max-w-md p-8 relative">
                {/* Exit Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                >
                    <X size={20}/>
                </button>

                {/* Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setTouched(true);
                        if (!isSaveDisabled) {
                            onSave(id, tableName).then((result) => {
                                if (result === "taken") {
                                    console.log("name is taken so we display the text next");
                                    setIsTaken(true);
                                } else {
                                    setIsTaken(false);
                                }
                            });
                        }
                    }}
                    className="flex flex-col gap-6"
                >
                    <h2 className="text-xl font-semibold mb-2">Edit Table</h2>

                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Table Name</label>
                        <input
                            type="text"
                            value={tableName}
                            onChange={(e) => {
                                setTableName(e.target.value)
                                setIsTaken(false)
                            }}
                            onBlur={() => setTouched(true)}
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white"
                        />
                        {touched && isSaveDisabled && (
                            <p className="text-red-500 text-xs mt-1">Table name cannot be empty.</p>
                        )}
                        {isTaken && (
                            <p className="text-red-500 text-xs mt-1">Table name is taken.</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-4">
                        {/* Delete Button */}
                        <button
                            type="button"
                            onClick={() => onDelete(id)}
                            className="px-4 py-2 rounded-xl text-sm bg-red-600 text-white hover:bg-red-700 transition"
                        >
                            Delete
                        </button>

                        {/* Save / Cancel */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm bg-zinc-300 dark:bg-zinc-600 text-zinc-800 dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-500 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaveDisabled}
                                className={`px-4 py-2 rounded-xl text-sm text-white transition ${
                                    isSaveDisabled
                                        ? "bg-blue-300 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
