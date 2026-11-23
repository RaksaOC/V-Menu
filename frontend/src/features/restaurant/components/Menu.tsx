"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Store } from "lucide-react";
import { Button, Skeleton, toast } from "@/components/ui";
import { createMenuItem, deleteMenuItem, getMenuItems, setItemAvailability, updateMenuItem } from "@/features/restaurant/api";
import { useRestaurantSlug } from "@/features/restaurant/useRestaurantSlug";
import MenuCard from "./MenuCard";
import ItemForm from "./ItemForm";
import type { ItemInput, ItemOutput } from "@/lib/types/Item";

/**
 * A restaurant's menu (CL-09; was two copies). The owner adds, edits and deletes dishes; the
 * cashier switches dishes on and off.
 */
export default function Menu({ role }: { role: "owner" | "cashier" }) {
    const slug = useRestaurantSlug();
    const [items, setItems] = useState<ItemOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<ItemOutput | "new" | null>(null);

    const load = useCallback(async () => {
        if (!slug) return;
        try {
            setItems(await getMenuItems(slug));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);

    async function toggle(item: ItemOutput) {
        const isEnabled = !item.isEnabled;
        setItems((all) => all.map((i) => (i._id === item._id ? { ...i, isEnabled } : i)));
        try {
            await setItemAvailability(slug, item._id, isEnabled);
            toast.info(`${item.name} ${isEnabled ? "enabled" : "disabled"}`);
        } catch {
            setItems((all) => all.map((i) => (i._id === item._id ? item : i)));
            toast.error(`Could not update ${item.name}`);
        }
    }

    async function save(item: ItemInput | ItemOutput) {
        try {
            if ("_id" in item) await updateMenuItem(slug, item);
            else await createMenuItem(slug, item);
            setEditing(null);
            await load();
        } catch {
            toast.error("Could not save the dish");
        }
    }

    async function remove(id: string) {
        try {
            await deleteMenuItem(slug, id);
            setEditing(null);
            await load();
        } catch {
            toast.error("Could not delete the dish");
        }
    }

    if (loading) return <Skeleton variant="menu" count={4} />;

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--ink)]">{role === "owner" ? "Manage Menu" : "Menu"}</h2>
                    <p className="text-sm text-[var(--muted)]">{role === "owner" ? "Create, Edit menu items" : "Switch off dishes that run out"}</p>
                </div>
                {role === "owner" && (
                    <Button icon={<Plus size={16} aria-hidden />} onClick={() => setEditing("new")}>
                        Add Item
                    </Button>
                )}
            </div>

            {items.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) =>
                        role === "owner" ? (
                            <MenuCard key={item._id} role="owner" item={item} onEdit={setEditing} />
                        ) : (
                            <MenuCard key={item._id} role="cashier" item={item} onToggle={toggle} />
                        ),
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center py-16 text-center text-[var(--muted)]">
                    <Store size={40} aria-hidden className="mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--ink)]">No dishes yet</h3>
                    <p className="mt-1 text-sm">{role === "owner" ? "Add your first dish with a photo." : "The owner hasn't added any dishes yet."}</p>
                </div>
            )}

            {editing && role === "owner" && (
                <ItemForm item={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
            )}
        </div>
    );
}
