import {useState} from "react";
import {House, PlusCircle, Type, X} from "lucide-react";

interface Props {
    onClose: () => void;
    onSave: (name: string) => void;
}

export function AddRestaurantPopup({onClose, onSave}: Props) {
    const [resName, setResName] = useState('');
    const isSaveDisabled = resName.trim() === "";
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSaveDisabled) {
            onSave(resName);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative transition-all">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                        <PlusCircle size={20} className="text-blue-600"/>
                        Add a New Restaurant
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                        aria-label="Close popup"
                    >
                        <X size={20} className="text-gray-500"/>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Table Name Input */}
                    <div className="space-y-2">
                        <label htmlFor="tableName" className="flex items-center gap-2 text-sm font-bold text-gray-800">
                            <House size={16} className="text-blue-500"/>
                            Restaurant Name
                        </label>
                        <input
                            id="tableName"
                            type="text"
                            value={resName}
                            onChange={(e) => setResName(e.target.value)}
                            placeholder="e.g. Burger House"
                            className="w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white border-gray-200 hover:border-gray-300"
                        />
                        {resName.trim() === "" && (
                            <p className="text-xs text-red-500">Please enter a restaurant name.</p>
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
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


