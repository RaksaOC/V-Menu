import {useEffect, useState} from "react";
import {X} from "lucide-react";
import {ItemOutput} from "@/app/shared/types/Item";

interface Props {
    id: string;
    name: string;
    price: number;
    image: string;
    onClose: () => void;
    onSave: (itemToEdit: ItemOutput) => void;
    onDelete: (id: string) => void;
}

export default function EditItemPopup({id, image, name, price, onClose, onSave, onDelete}:Props) {
    const [imagePreview, setImagePreview] = useState(image);
    const [editedName, setEditedName] = useState(name);
    const [editedPrice, setEditedPrice] = useState(price);
    const [showError, setShowError] = useState(false);

    const handleImageChange = (e : any) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e:any) => {
        e.preventDefault();
        if (editedName.trim() === "") {
            setShowError(true);
            return;
        }

        onSave({
            _id: id,
            image: imagePreview || image,
            name: editedName || name,
            price: editedPrice || price,
            isEnabled: true
        });
    };

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
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <h2 className="text-xl font-semibold mb-4">Edit Menu Item</h2>

                    {/* Image Upload */}
                    <div>
                        <div className="flex items-end gap-4 justify-between">
                            <div
                                className="w-36 h-36 bg-zinc-100 dark:bg-zinc-700 rounded-lg overflow-hidden border border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                                {imagePreview || image ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center px-2">
                                        No image
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 text-right">
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="fileInput"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <label htmlFor="fileInput">
                                    <span
                                        className="inline-block px-4 py-2 bg-blue-600 text-white text-xs rounded-xl cursor-pointer hover:bg-blue-700 transition">
                                        Choose Image
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Name Input with Error UI */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Item Name</label>
                        <input
                            type="text"
                            className={`w-full p-2 rounded-lg text-sm text-zinc-900 dark:text-white
                                bg-zinc-100 dark:bg-zinc-700 
                                ${showError ? 'border border-red-500' : 'border border-transparent'}`}
                            value={editedName}
                            onChange={(e) => {
                                setEditedName(e.target.value);
                                if (e.target.value.trim() !== "") setShowError(false);
                            }}
                            required
                        />
                        {showError && (
                            <p className="text-xs text-red-500 mt-1">
                                Name cannot be empty.
                            </p>
                        )}
                    </div>

                    {/* Price Input */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Price</label>
                        <input
                            type="number"
                            step="0.01"
                            value={editedPrice}
                            onChange={(e) => setEditedPrice(parseFloat(e.target.value))}
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white"
                            required
                        />
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

                        {/* Edit / Cancel Buttons */}
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
                                className="px-4 py-2 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700 transition"
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
