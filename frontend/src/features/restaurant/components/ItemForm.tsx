"use client";

import { useId, useState, type FormEvent } from "react";
import { ImageIcon, Trash2, Upload, X } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { toCents } from "@/lib/money";
import { PHOTO_TYPES, usePhoto } from "./use-photo";
import type { Category, CreateItemBody, MenuItem } from "@vmenu/contracts";

const PLACEHOLDER = "/images/img.png";

interface Props {
    /** Without an item the form adds one; with an item it edits or deletes it. */
    item?: MenuItem;
    /** VM-25: when given, the form has a category select ("Other" is none). */
    categories?: Category[];
    onClose: () => void;
    onSave: (item: CreateItemBody | MenuItem) => void;
    onDelete?: (id: string) => void;
}

/** Add and edit a dish, in the shared Modal (CL-09; was AddItemPopup and EditItemPopup). */
export default function ItemForm({ item, categories, onClose, onSave, onDelete }: Props) {
    const categoryFieldId = useId();
    const formId = useId();
    const fileId = useId();
    const photo = usePhoto(item?.image ?? "");
    const [name, setName] = useState(item?.name ?? "");
    const [price, setPrice] = useState(item ? String(item.priceCents / 100) : ""); // typed in dollars, saved in cents (CL-07);
    const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
    const [errors, setErrors] = useState({ name: "", price: "" });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    function validate() {
        const next = { name: "", price: "" };
        if (!name.trim()) next.name = "Item name is required";
        else if (name.trim().length < 2) next.name = "Item name must be at least 2 characters";
        if (!price) next.price = "Price is required";
        else if (!(parseFloat(price) > 0)) next.price = "Price must be greater than 0";
        setErrors(next);
        return !next.name && !next.price;
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            // VM-02: a new photo is uploaded first; the item stores its short URL.
            const uploaded = await photo.upload();
            const fields = {
                name: name.trim(),
                priceCents: toCents(parseFloat(price)),
                image: uploaded ?? item?.image ?? PLACEHOLDER,
                isEnabled: item?.isEnabled ?? true,
                ...(categories && { categoryId: categoryId || null }),
            };
            onSave(item ? { _id: item._id, ...fields } : fields);
        } catch {
            // the photo field says why the upload failed
        } finally {
            setSaving(false);
        }
    }

    const footer = confirmDelete ? (
        <>
            <p className="mr-auto self-center text-sm text-[var(--bad)]">Delete {item?.name}? This can&apos;t be undone.</p>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
            </Button>
            <Button variant="danger" onClick={() => item && onDelete?.(item._id)}>
                Delete
            </Button>
        </>
    ) : (
        <>
            {item && onDelete && (
                <Button
                    variant="outline"
                    className="mr-auto"
                    icon={<Trash2 size={16} aria-hidden />}
                    onClick={() => setConfirmDelete(true)}
                >
                    Delete
                </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
                {photo.progress !== null ? `Uploading ${photo.progress}%` : saving ? "Saving..." : item ? "Save Changes" : "Save"}
            </Button>
        </>
    );

    return (
        <Modal title={item ? "Edit Menu Item" : "Add Menu Item"} onClose={onClose} footer={footer}>
            <form id={formId} onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                    <span className="block text-sm font-semibold">Item Image</span>
                    <div className="flex items-start gap-4">
                        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-card)] border border-dashed border-[var(--line)] bg-[var(--card)]">
                            {photo.preview ? (
                                <>
                                    <img src={photo.preview} alt="Preview" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        aria-label="Remove the chosen photo"
                                        onClick={() => photo.reset(item?.image ?? "")}
                                        className="absolute right-1.5 top-1.5 rounded-full bg-[var(--bad)] p-1 text-white"
                                    >
                                        <X size={12} aria-hidden />
                                    </button>
                                </>
                            ) : (
                                <ImageIcon size={24} aria-hidden className="text-[var(--muted)]" />
                            )}
                        </div>
                        <div className="space-y-2 text-sm">
                            <input id={fileId} type="file" accept={PHOTO_TYPES} onChange={photo.choose} className="sr-only" />
                            <label
                                htmlFor={fileId}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--r-chip)] border border-[var(--line)] px-3 py-2 font-medium hover:bg-[var(--card)]"
                            >
                                <Upload size={16} aria-hidden /> Choose Image
                            </label>
                            <p className="text-xs text-[var(--muted)]">JPG, PNG or WebP, up to 5 MB</p>
                            {photo.progress !== null && (
                                <p className="text-xs text-[var(--accent-text)]" aria-live="polite">
                                    Uploading… {photo.progress}%
                                </p>
                            )}
                            {photo.error && (
                                <p role="alert" className="text-xs text-[var(--bad)]">
                                    {photo.error}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <Input
                    label="Item Name"
                    value={name}
                    placeholder="Enter item name"
                    error={errors.name || undefined}
                    onChange={(e) => {
                        setName(e.target.value);
                        setErrors((x) => ({ ...x, name: "" }));
                    }}
                />
                <Input
                    label="Price ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    placeholder="0.00"
                    error={errors.price || undefined}
                    onChange={(e) => {
                        setPrice(e.target.value);
                        setErrors((x) => ({ ...x, price: "" }));
                    }}
                />
                {categories && (
                    <div className="space-y-1.5">
                        <label htmlFor={categoryFieldId} className="block text-sm font-semibold text-[var(--ink)]">
                            Category
                        </label>
                        <select
                            id={categoryFieldId}
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full rounded-[var(--r-in)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                            <option value="">Other (no category)</option>
                            {categories.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </form>
        </Modal>
    );
}
