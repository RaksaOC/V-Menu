import { useState } from "react";
import { X } from "lucide-react";
import { TableInput } from "@/app/shared/types/Table";

interface Props {
    onClose: () => void;
    onSave: (tableAddType: TableInput) => void;
}

export default function AddTablePopup({ onClose, onSave }: Props) {
    const [useAutoIncrement, setUseAutoIncrement] = useState(true);
    const [tableName, setTableName] = useState("");

    const isSaveDisabled = !useAutoIncrement && tableName.trim() === "";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSaveDisabled) {
            onSave({
                name: useAutoIncrement ? "" : tableName,
                type: useAutoIncrement ? "auto" : "manual",
                isEnabled: true,
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative transition-all">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-semibold text-gray-900">Add a New Table</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                        aria-label="Close popup"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Table Type Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-800">
                            Select Table Type
                        </label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="tableMode"
                                    checked={useAutoIncrement}
                                    onChange={() => setUseAutoIncrement(true)}
                                />
                                <span>Auto</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="tableMode"
                                    checked={!useAutoIncrement}
                                    onChange={() => setUseAutoIncrement(false)}
                                />
                                <span>Manual</span>
                            </label>
                        </div>
                    </div>

                    {/* Table Name Input */}
                    <div className="space-y-2">
                        <label htmlFor="tableName" className="block text-sm font-bold text-gray-800">
                            Table Name
                        </label>
                        <input
                            id="tableName"
                            type="text"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value.toLowerCase())}
                            placeholder="e.g. tablecard-7"
                            disabled={useAutoIncrement}
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white border-gray-200 hover:border-gray-300"
                        />
                        {!useAutoIncrement && tableName.trim() === "" && (
                            <p className="text-xs text-red-500">Please enter a table name.</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
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
                            Save Table
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
