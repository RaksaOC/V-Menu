import { useState } from "react";
import { X, Upload, ImageIcon, Tag, DollarSign, PlusCircle } from "lucide-react";

interface ItemInput {
    name: string;
    price: number;
    image: string;
    isEnabled: boolean;
}

interface Props {
    onClose: () => void;
    onSave: (newItem: ItemInput) => void;
}

export default function AddItemPopup({ onClose, onSave }: Props) {
    const [imagePreview, setImagePreview] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [errors, setErrors] = useState({ name: "", price: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageChange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("Image size should be less than 5MB");
                return;
            }
            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file");
                return;
            }

            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = () => {
        const newErrors = { name: "", price: "" };
        let isValid = true;

        if (!name.trim()) {
            newErrors.name = "Item name is required";
            isValid = false;
        } else if (name.trim().length < 2) {
            newErrors.name = "Item name must be at least 2 characters";
            isValid = false;
        }

        if (!price) {
            newErrors.price = "Price is required";
            isValid = false;
        } else if (parseFloat(price) <= 0) {
            newErrors.price = "Price must be greater than 0";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!validateForm()) return;
        setIsSubmitting(true);

        try {
            let imageUrl = "/images/img.png";
            if (imagePreview) {
                imageUrl = imagePreview;
            }

            onSave({
                name: name.trim(),
                price: parseFloat(price),
                image: imageUrl,
                isEnabled: true,
            });
        } catch (error) {
            console.error("Error saving item:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearImage = () => {
        setImagePreview("");
        setImageFile(null);
        const fileInput: HTMLInputElement = document.getElementById("fileInput") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <PlusCircle size={20} className="text-blue-500" /> Add Menu Item
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Image Upload Section */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-800 flex items-center gap-1">
                            <ImageIcon size={16} className="text-blue-500" /> Item Image
                        </label>

                        <div className="flex items-start gap-4">
                            <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative group">
                                {imagePreview ? (
                                    <>
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={clearImage}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <ImageIcon size={24} className="text-gray-400 mx-auto mb-1" />
                                        <span className="text-xs text-gray-500">No image</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="fileInput"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <label htmlFor="fileInput">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
                                        <Upload size={16} />
                                        <span className="text-sm font-medium">Choose Image</span>
                                    </div>
                                </label>
                                <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Item Name */}
                    <div className="space-y-2">
                        <label className=" text-sm font-bold text-gray-800 flex items-center gap-1">
                            <Tag size={16} className="text-blue-500" /> Item Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name) setErrors({ ...errors, name: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.name
                                    ? "border-red-300 bg-red-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                            placeholder="Enter item name"
                        />
                        {errors.name && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
                            <DollarSign size={16} className="text-blue-500" /> Price ($) *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={price}
                            onChange={(e) => {
                                setPrice(e.target.value);
                                if (errors.price) setErrors({ ...errors, price: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.price
                                    ? "border-red-300 bg-red-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                            placeholder="0.00"
                        />
                        {errors.price && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                {errors.price}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                        >
                            {isSubmitting ? "Saving..." : "Save Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
