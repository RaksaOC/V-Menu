import {useState} from "react";
import {X} from "lucide-react";
import {ref, uploadBytes, getDownloadURL} from "firebase/storage";
import {storage} from "../../../../../../../../v-menu-old-backup/admin/frontend/src/firebase/config.js";
import axios from "axios";
import {ItemInput} from "@/app/shared/types/Item";

interface Props {
    onClose: () => void;
    onSave: (newItem: ItemInput) => void;
}

export default function AddItemPopup({onClose, onSave}: Props) {
    const [imagePreview, setImagePreview] = useState("");
    // const [imageUrl, setImageUrl] = useState(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState(0);
    const [showError, setShowError] = useState(false);

    const handleImageChange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
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
                    onSubmit={async (e) => {
                        e.preventDefault();

                        // Default image URL if no image is selected
                        let imageUrl = "/images/img.png"

                        // TODO: uncomment this in production use default picture locally for now

                        // let imageUrl = "https://firebasestorage.googleapis.com/v0/b/v-menu-e9835.firebasestorage.app/o/grey_fork_and_knife.png?alt=media&token=0dab98b1-1fd9-4035-86d3-0e8f5755c9c1";
                        //
                        // if (imageFile) {
                        //     try {
                        //         const imageRef = ref(storage, `menu-images/${imageFile.name}`);
                        //         await uploadBytes(imageRef, imageFile);
                        //         imageUrl = await getDownloadURL(imageRef); // get the uploaded image URL
                        //     } catch (error) {
                        //         console.error("Upload failed", error);
                        //     }
                        // }

                        // Save the data with either the uploaded image URL or the default one
                        onSave({
                            name,
                            price,
                            image: imageUrl,
                            isEnabled: true,
                        });
                    }}

                    className="flex flex-col gap-6"
                >
                    <h2 className="text-xl font-semibold mb-4">Add Menu Item</h2>
                    {/* Image Upload */}
                    <div>
                        <div className="flex items-end gap-4 justify-between">
                            {/* Image preview */}
                            <div
                                className="w-36 h-36 bg-zinc-100 dark:bg-zinc-700 rounded-lg overflow-hidden border border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
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
                    className="inline-block px-4 py-2 bg-blue-600 text-white text-xs rounded-xl cursor-pointer hover:bg-blue-700 transition">
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
                            className={`w-full p-2 rounded-lg text-sm text-zinc-900 dark:text-white 
                                bg-zinc-100 dark:bg-zinc-700 
                                ${showError ? 'border border-red-500' : 'border border-transparent'}
                            `}
                            required
                            onChange={(e) => {
                                setName(e.target.value);
                                if (e.target.value.trim() !== "") setShowError(false);
                            }}
                            value={name}
                        />
                        {showError && (
                            <p className="text-xs text-red-500 mt-1 animate-fade-in">
                                Item name cannot be empty.
                            </p>
                        )}
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Price</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white"
                            required
                            onChange={(e) => setPrice(parseInt(e.target.value))}
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
                            onClick={() => {
                                if (name === "") {
                                    setShowError(true);
                                    setName("");
                                    setPrice(0);
                                }
                            }}
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
