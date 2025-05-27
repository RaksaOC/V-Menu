import { useState } from "react";
import { X, Upload, Image, Trash2 } from "lucide-react";

// Simplified types for demo
interface ItemOutput {
    _id: string;
    name: string;
    price: number;
    image: string;
    isEnabled: boolean;
}

interface Props {
    id: string;
    name: string;
    price: number;
    image: string;
    onClose: () => void;
    onSave: (itemToEdit: ItemOutput) => void;
    onDelete: (id: string) => void;
}

export default function EditItemPopup({ id, image, name, price, onClose, onSave, onDelete }: Props) {
    const [imagePreview, setImagePreview] = useState(image);
    const [imageFile, setImageFile] = useState(null);
    const [editedName, setEditedName] = useState(name);
    const [editedPrice, setEditedPrice] = useState(price.toString());
    const [errors, setErrors] = useState({ name: "", price: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleImageChange = (e : any) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert("Image size should be less than 5MB");
                return;
            }

            // Validate file type
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

        if (!editedName.trim()) {
            newErrors.name = "Item name is required";
            isValid = false;
        } else if (editedName.trim().length < 2) {
            newErrors.name = "Item name must be at least 2 characters";
            isValid = false;
        }

        if (!editedPrice) {
            newErrors.price = "Price is required";
            isValid = false;
        } else if (parseFloat(editedPrice) <= 0) {
            newErrors.price = "Price must be greater than 0";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e:any) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            // Use the current preview or original image
            let finalImageUrl = imagePreview || image;

            // In production, upload new image to your storage service here
            // For now, using preview URL or original
            if (imageFile) {
                // This would be replaced with actual upload logic
                finalImageUrl = imagePreview;
            }

            onSave({
                _id: id,
                name: editedName.trim(),
                price: parseFloat(editedPrice),
                image: finalImageUrl,
                isEnabled: true,
            });
        } catch (error) {
            console.error("Error updating item:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        onDelete(id);
        setShowDeleteConfirm(false);
    };

    const clearImage = () => {
        setImagePreview("");
        setImageFile(null);
        // Reset file input
        const fileInput : HTMLInputElement = document.getElementById("fileInput") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    const resetToOriginalImage = () => {
        setImagePreview(image);
        setImageFile(null);
        // Reset file input
        const fileInput : HTMLInputElement = document.getElementById("fileInput") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Menu Item</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        type="button"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Image Upload Section */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Item Image
                        </label>

                        <div className="flex items-start gap-4">
                            {/* Image Preview */}
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
                                        <Image size={24} className="text-gray-400 mx-auto mb-1" />
                                        <span className="text-xs text-gray-500">No image</span>
                                    </div>
                                )}
                            </div>

                            {/* Upload Controls */}
                            <div className="flex-1 space-y-2">
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
                                        <span className="text-sm font-medium">Change Image</span>
                                    </div>
                                </label>

                                {imagePreview !== image && (
                                    <button
                                        type="button"
                                        onClick={resetToOriginalImage}
                                        className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Reset to Original
                                    </button>
                                )}

                                <p className="text-xs text-gray-500">
                                    PNG, JPG up to 5MB
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Item Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Item Name *
                        </label>
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => {
                                setEditedName(e.target.value);
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
                        <label className="block text-sm font-medium text-gray-700">
                            Price ($) *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedPrice}
                            onChange={(e) => {
                                setEditedPrice(e.target.value);
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

                    {/* Delete Confirmation */}
                    {showDeleteConfirm && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <Trash2 size={20} className="text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-red-800">Delete Item</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        Are you sure you want to delete "{editedName}"? This action cannot be undone.
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
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        {/* Delete Button */}
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                            disabled={isSubmitting}
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>

                        {/* Save/Cancel Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                            >
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}