"use client";

import { useId, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { toCents } from "@/lib/money";
import PhotoField from "./PhotoField";
import TagsField from "./TagsField";
import { usePhoto } from "./use-photo";
import { checkItem, DISH_TAGS, ITEM_DESCRIPTION_MAX, type ItemFieldErrors } from "../item-rules";
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
    const descriptionId = useId();
    const formId = useId();
    const photo = usePhoto(item?.image ?? "");
    const [name, setName] = useState(item?.name ?? "");
    const [price, setPrice] = useState(item ? String(item.priceCents / 100) : ""); // typed in dollars, saved in cents (CL-07);
    const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
    const [description, setDescription] = useState(item?.description ?? ""); // VM-26
    const [tags, setTags] = useState<string[]>(item?.tags ?? []);
    const [errors, setErrors] = useState<ItemFieldErrors>(NO_ERRORS);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        const found = checkItem({ name, price, description }); // VM-17: the server's rules, before sending
        setErrors(found);
        if (Object.keys(found).length) return;
        setSaving(true);
        try {
            // VM-02: a new photo is uploaded first; the item stores its short URL.
            const uploaded = await photo.upload();
            const fields = {
                name: name.trim(),
                priceCents: toCents(Number(price)), // checkItem has refused anything that isn't a price (VM-17)
                image: uploaded ?? item?.image ?? PLACEHOLDER,
                isEnabled: item?.isEnabled ?? true,
                ...(categories && { categoryId: categoryId || null }),
                description: description.trim(),
                tags: DISH_TAGS.filter((tag) => tags.includes(tag)) as CreateItemBody["tags"],
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
                <PhotoField photo={photo} original={item?.image ?? ""} error={errors.image} />
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
                <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                        <label htmlFor={descriptionId} className="block text-sm font-semibold text-[var(--ink)]">
                            Description (optional)
                        </label>
                        <span aria-hidden className="font-[family-name:var(--f-label)] text-xs text-[var(--muted)]">
                            {description.trim().length}/{ITEM_DESCRIPTION_MAX}
                        </span>
                    </div>
                    <textarea
                        id={descriptionId}
                        rows={3}
                        value={description}
                        placeholder="What's in it, how it's served"
                        aria-invalid={errors.description ? true : undefined}
                        aria-describedby={errors.description ? `${descriptionId}-note` : undefined}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            setErrors(({ description: _, ...rest }) => rest);
                        }}
                        className={`w-full rounded-[var(--r-in)] border bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${errors.description ? "border-[var(--bad)]" : "border-[var(--line)]"}`}
                    />
                    {errors.description && (
                        <p id={`${descriptionId}-note`} className="text-xs text-[var(--bad)]">
                            {errors.description}
                        </p>
                    )}
                </div>
                <TagsField tags={tags} setTags={setTags} error={errors.tags} />
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
