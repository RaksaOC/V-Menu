"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Modal, toast } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { createCategory, deleteCategory, getCategories, renameCategory, reorderCategories } from "@/features/restaurant/api";
import type { Category } from "@vmenu/contracts";
import CategoryActions from "./CategoryActions";

interface Props {
    slug: string;
    categories: Category[];
    onClose: () => void;
    /** After every change, with the categories as the server now has them. */
    onChanged: (categories: Category[]) => void;
}

/** VM-25: the owner adds, renames, reorders (up and down) and deletes the menu's categories. */
export default function CategoriesManager({ slug, categories, onClose, onChanged }: Props) {
    const [list, setList] = useState(categories);
    const [name, setName] = useState("");
    const [addError, setAddError] = useState("");
    const [renaming, setRenaming] = useState<{ id: string; name: string; error: string } | null>(null);
    const [deleting, setDeleting] = useState<Category | null>(null);
    const [busy, setBusy] = useState(false);

    function changed(fresh: Category[]) {
        setList(fresh);
        onChanged(fresh);
    }

    async function add(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) return setAddError("Give the category a name");
        setBusy(true);
        try {
            await createCategory(slug, name.trim());
            setName("");
            setAddError("");
            changed(await getCategories(slug));
        } catch (err) {
            setAddError(apiErrorMessage(err, "Could not add the category"));
        } finally {
            setBusy(false);
        }
    }

    async function saveName(e: FormEvent) {
        e.preventDefault();
        if (!renaming) return;
        setBusy(true);
        try {
            await renameCategory(slug, renaming.id, renaming.name.trim());
            setRenaming(null);
            changed(await getCategories(slug));
        } catch (err) {
            setRenaming({ ...renaming, error: apiErrorMessage(err, "Could not rename the category") });
        } finally {
            setBusy(false);
        }
    }

    async function move(index: number, by: -1 | 1) {
        const ids = list.map((c) => c._id);
        [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
        setBusy(true);
        try {
            changed(await reorderCategories(slug, ids));
        } catch (err) {
            toast.error(apiErrorMessage(err, "Could not change the order"));
        } finally {
            setBusy(false);
        }
    }

    async function remove(category: Category) {
        setBusy(true);
        try {
            await deleteCategory(slug, category._id);
            setDeleting(null);
            changed(await getCategories(slug));
        } catch (err) {
            toast.error(apiErrorMessage(err, `Could not delete ${category.name}`));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            title="Categories"
            description="The order here is the order on the customer's menu. Dishes with no category are shown last, under Other."
            onClose={onClose}
            footer={<Button onClick={onClose}>Done</Button>}
        >
            <div className="space-y-5">
                {list.length > 0 ? (
                    <ol className="divide-y divide-[var(--line)] rounded-[var(--r-card)] border border-[var(--line)]">
                        {list.map((category, index) => (
                            <li key={category._id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                                {renaming?.id === category._id ? (
                                    <form onSubmit={saveName} className="flex w-full flex-wrap items-end gap-2">
                                        <div className="min-w-0 flex-1">
                                            <Input
                                                label={`Name for ${category.name}`}
                                                value={renaming.name}
                                                maxLength={40}
                                                autoFocus
                                                error={renaming.error || undefined}
                                                onChange={(e) => setRenaming({ ...renaming, name: e.target.value, error: "" })}
                                            />
                                        </div>
                                        <Button type="submit" size="sm" disabled={busy}>
                                            Save
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setRenaming(null)}>
                                            Cancel
                                        </Button>
                                    </form>
                                ) : deleting?._id === category._id ? (
                                    <div className="flex w-full flex-wrap items-center gap-2">
                                        <p className="mr-auto text-sm text-[var(--bad)]">
                                            Delete {category.name}? Its dishes move to Other.
                                        </p>
                                        <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => remove(category)}
                                            aria-label={`Yes, delete ${category.name}`}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ) : (
                                    <CategoryActions
                                        category={category}
                                        isFirst={index === 0}
                                        isLast={index === list.length - 1}
                                        busy={busy}
                                        onMove={(by) => move(index, by)}
                                        onRename={() => setRenaming({ id: category._id, name: category.name, error: "" })}
                                        onDelete={() => setDeleting(category)}
                                    />
                                )}
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="text-sm text-[var(--muted)]">No categories yet. Add the first one, e.g. Mains or Drinks.</p>
                )}

                <form onSubmit={add} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <Input
                            label="New category"
                            value={name}
                            maxLength={40}
                            placeholder="e.g. Drinks"
                            error={addError || undefined}
                            onChange={(e) => {
                                setName(e.target.value);
                                setAddError("");
                            }}
                        />
                    </div>
                    <Button type="submit" icon={<Plus size={16} aria-hidden />} disabled={busy}>
                        Add
                    </Button>
                </form>
            </div>
        </Modal>
    );
}
