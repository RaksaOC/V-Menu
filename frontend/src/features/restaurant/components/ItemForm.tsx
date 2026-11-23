"use client";

import { useId, useState, type FormEvent } from "react";
import { ImageIcon, Trash2, Upload, X } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { PHOTO_TYPES, usePhoto } from "./use-photo";
import { checkItem, type ItemFieldErrors } from "../item-rules";
import type { Category, CreateItemBody, MenuItem } from "@vmenu/contracts";

const PLACEHOLDER = "/images/img.png";

const NO_ERRORS: ItemFieldErrors = {};

interface Props {
    /** Without an item the form adds one; with an item it edits or deletes it. */
    item?: MenuItem;
    /** VM-25: when given, the form has a category select ("Other" is none). */
    categories?: Category[];
    onClose: () => void;
    /** May answer the server's reasons per field (VM-17); they are shown next to the fields. */
    onSave: (item: CreateItemBody | MenuItem) => Promise<ItemFieldErrors | void> | void;
    onDelete?: (id: string) => void;
}

/** Add and edit a dish, in the shared Modal (CL-09; was AddItemPopup and EditItemPopup). */
export default function ItemForm({ item, categories, onClose, onSave, onDelete }: Props) {
    const categoryFieldId = useId();
    const formId = useId();
    const fileId = useId();
    const photo = usePhoto(item?.image ?? "");
    const [name, setName] = useState(item?.name ?? "");
    const [price, setPrice] = useState(item ? String(item.price) : "");
    const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
    const [errors, setErrors] = useState<ItemFieldErrors>(NO_ERRORS);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        const found = checkItem({ name, price }); // VM-17: the server's rules, before sending
        setErrors(found);
        if (Object.keys(found).length) return;
        setSaving(true);
        try {
            // VM-02: a new photo is uploaded first; the item stores its short URL.
            const uploaded = await photo.upload();
            const fields = {
                name: name.trim(),
                price: Number(price),
                image: uploaded ?? item?.image ?? PLACEHOLDER,
                isEnabled: item?.isEnabled ?? true,
                ...(categories && { categoryId: categoryId || null }),
            };
            const refused = await onSave(item ? { _id: item._id, ...fields } : fields);
            if (refused) setErrors(refused); // VM-17: the server's reasons, next to the fields
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
            <form id={formId} onSubmit={submit} noValidate className="space-y-5">
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
                            {(photo.error || errors.image) && (
                                <p role="alert" className="text-xs text-[var(--bad)]">
                                    {photo.error || errors.image}
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
                        setErrors(({ name: _, ...rest }) => rest);
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
                        setErrors(({ price: _, ...rest }) => rest);
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
                            aria-invalid={errors.categoryId ? true : undefined}
                            aria-describedby={errors.categoryId ? `${categoryFieldId}-note` : undefined}
                            onChange={(e) => {
                                setCategoryId(e.target.value);
                                setErrors(({ categoryId: _, ...rest }) => rest);
                            }}
                            className="w-full rounded-[var(--r-in)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                            <option value="">Other (no category)</option>
                            {categories.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {errors.categoryId && (
                            <p id={`${categoryFieldId}-note`} className="text-xs text-[var(--bad)]">
                                {errors.categoryId}
                            </p>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    );
}
