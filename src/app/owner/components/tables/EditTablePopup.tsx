import {useState} from "react";
import {Pencil, PlusCircle, Trash2, Type, X} from "lucide-react";

interface editedItem {
    name: string;
}

interface Props {
    id: string;
    name: string;
    onClose: () => void;
    onSave: (id: string, newName: string) => Promise<"ok" | "taken" | "error" | undefined>;
    onDelete: (id: string) => void;
}

export default function EditTablePopup({id, name, onClose, onSave, onDelete}: Props) {
    const [tableName, setTableName] = useState(name || "");
    const [touched, setTouched] = useState(false);
    const [isTaken, setIsTaken] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isSaveDisabled = tableName.trim() === "";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!isSaveDisabled) {
            onSave(id, tableName).then((result) => {
                setIsTaken(result === "taken");
            });
        }
    };

    const handleDelete = () => {
        onDelete(id);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto relative">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                        <Pencil size={20} className="text-blue-600"/>
                        Edit Table
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                    >
                        <X size={20} className="text-gray-500"/>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Table Name */}
                    <div className="space-y-2">
                        <label htmlFor="tableName" className="flex items-center gap-2 text-sm font-bold text-gray-800">
                            <Type size={16} className="text-blue-500"/>
                            Table Name
                        </label>
                        <input
                            type="text"
                            value={tableName}
                            onChange={(e) => {
                                setTableName(e.target.value);
                                setIsTaken(false);
                            }}
                            onBlur={() => setTouched(true)}
                            placeholder="Enter new table name"
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-zinc-100 text-gray-900 border-gray-200 hover:border-gray-300"
                        />
                        {touched && isSaveDisabled && (
                            <p className="text-red-500 text-xs">Table name cannot be empty.</p>
                        )}
                        {isTaken && (
                            <p className="text-red-500 text-xs">Table name is taken.</p>
                        )}
                    </div>

                    {/* Delete Confirmation */}
                    {showDeleteConfirm && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <Trash2 size={20} className="text-red-600"/>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-red-800">Delete Table</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        Are you sure you want to delete "{tableName || name}"? This action cannot be
                                        undone.
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-3 py-1.5 text-sm bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            type="button"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                        >
                            <Trash2 size={16}/>
                            Delete
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-zinc-800 hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaveDisabled}
                                className={`px-4 py-2 rounded-lg text-sm text-white transition ${
                                    isSaveDisabled
                                        ? "bg-blue-300 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}