import {useState} from "react";
import {X} from "lucide-react";

export default function AddItemPopup({onClose, onSave}) {
    const [imagePreview, setImagePreview] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
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
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSave(); // Handle actual form data in real use
                    }}
                    className="flex flex-col gap-6"
                >
                    <h2 className="text-xl font-semibold mb-4">Add Menu Item</h2>
                    {/* Image Upload */}
                    <div>
                        <div className="flex items-end gap-4 justify-between">
                            {/* Image preview */}
                            <div
                                className="w-48 h-48 bg-zinc-100 dark:bg-zinc-700 rounded-lg overflow-hidden border border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                                {imagePreview ? (
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

                            {/* Hidden file input + Button */}
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
                    className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-xl cursor-pointer hover:bg-blue-700 transition">
                    Choose Image
                </span>
                                </label>
                            </div>
                        </div>
                    </div>


                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Item Name</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white"
                            required
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Price</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white"
                            required
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
                            className="px-4 py-2 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
