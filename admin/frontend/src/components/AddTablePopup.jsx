import { useState } from "react";
import { X } from "lucide-react";

export default function AddTablePopup({ onClose, onSave }) {
    const [useAutoIncrement, setUseAutoIncrement] = useState(true);
    const [tableName, setTableName] = useState("");

    const isSaveDisabled = !useAutoIncrement && tableName.trim() === "";

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg w-full max-w-md p-8 relative">
                {/* Exit Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                >
                    <X size={20} />
                </button>

                {/* Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!isSaveDisabled) {
                            onSave({ name: useAutoIncrement ? null : tableName });
                        }
                    }}
                    className="flex flex-col gap-6"
                >
                    <h2 className="text-xl font-semibold mb-2">Add Table</h2>

                    {/* Radio Options */}
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="tableNameMode"
                                checked={useAutoIncrement}
                                onChange={() => setUseAutoIncrement(true)}
                            />
                            Auto-increment
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="tableNameMode"
                                checked={!useAutoIncrement}
                                onChange={() => setUseAutoIncrement(false)}
                            />
                            Manual Name
                        </label>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Table Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Table 7"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            disabled={useAutoIncrement}
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white disabled:opacity-50"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-2 mt-4">
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
                </form>
            </div>
        </div>
    );
}
