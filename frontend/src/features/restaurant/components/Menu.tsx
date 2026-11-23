"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Store, Tags } from "lucide-react";
import { Button, Skeleton, toast } from "@/components/ui";
import {
    createMenuItem,
    deleteMenuItem,
    getCategories,
    getMenuItems,
    setItemAvailability,
    updateMenuItem,
} from "@/features/restaurant/api";
import { useRestaurantSlug } from "@/features/restaurant/use-restaurant-slug";
import { apiErrorFields, apiErrorMessage } from "@/lib/api";
import MenuCard from "./MenuCard";
import ItemForm from "./ItemForm";
import CategoriesManager from "./CategoriesManager";
import type { Category, CreateItemBody, MenuItem } from "@vmenu/contracts";

const ALL = "all";
const OTHER = "other";

/**
 * A restaurant's menu (CL-09; was two copies). The owner adds, edits and deletes dishes and
 * arranges the categories (VM-25); the cashier switches dishes on and off. Both can show one
 * category at a time.
 */
export default function Menu({ role }: { role: "owner" | "cashier" }) {
    const slug = useRestaurantSlug();
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filter, setFilter] = useState<string>(ALL);
    const [managing, setManaging] = useState(false);

    const load = useCallback(async () => {
        if (!slug) return;
        try {
            const [dishes, sections] = await Promise.all([getMenuItems(slug), getCategories(slug)]);
            setItems(dishes);
            setCategories(sections);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);

    async function toggle(item: MenuItem) {
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

    /** Answers the server's per-field reasons when it refused the dish (VM-17), for the popup to show. */
    async function save(item: CreateItemBody | MenuItem) {
        try {
            if ("_id" in item) await updateMenuItem(slug, item);
            else await createMenuItem(slug, item);
            setEditing(null);
            await load();
        } catch (err) {
            const fields = apiErrorFields(err);
            if (fields) return fields;
            toast.error(apiErrorMessage(err, "Could not save the dish"));
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

    // VM-25: a dish whose category is gone counts as Other, as on the customer's menu
    const known = new Set(categories.map((c) => c._id));
    const shown = items.filter((item) =>
        filter === ALL ? true : filter === OTHER ? !item.categoryId || !known.has(item.categoryId) : item.categoryId === filter,
    );
    const filters = [{ id: ALL, name: "All" }, ...categories.map((c) => ({ id: c._id, name: c.name })), { id: OTHER, name: "Other" }];

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--ink)]">{role === "owner" ? "Manage Menu" : "Menu"}</h2>
                    <p className="text-sm text-[var(--muted)]">
                        {role === "owner" ? "Create, Edit menu items" : "Switch off dishes that run out"}
                    </p>
                </div>
                {role === "owner" && (
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" icon={<Tags size={16} aria-hidden />} onClick={() => setManaging(true)}>
                            Categories
                        </Button>
                        <Button icon={<Plus size={16} aria-hidden />} onClick={() => setEditing("new")}>
                            Add Item
                        </Button>
                    </div>
                )}
            </div>

            {categories.length > 0 && (
                <div role="group" aria-label="Filter by category" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            aria-pressed={filter === f.id}
                            onClick={() => setFilter(f.id)}
                            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                                filter === f.id
                                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                                    : "border-[var(--line)] text-[var(--ink)] hover:bg-[var(--card)]"
                            }`}
                        >
                            {f.name}
                        </button>
                    ))}
                </div>
            )}

            {shown.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shown.map((item) =>
                        role === "owner" ? (
                            <MenuCard key={item._id} role="owner" item={item} onEdit={setEditing} />
                        ) : (
                            <MenuCard key={item._id} role="cashier" item={item} onToggle={toggle} />
                        ),
                    )}
                </div>
            ) : items.length > 0 ? (
                <p className="py-12 text-center text-sm text-[var(--muted)]">No dishes in this category yet.</p>
            ) : (
                <div className="flex flex-col items-center py-16 text-center text-[var(--muted)]">
                    <Store size={40} aria-hidden className="mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--ink)]">No dishes yet</h3>
                    <p className="mt-1 text-sm">
                        {role === "owner" ? "Add your first dish with a photo." : "The owner hasn't added any dishes yet."}
                    </p>
                </div>
            )}

            {editing && role === "owner" && (
                <ItemForm
                    item={editing === "new" ? undefined : editing}
                    categories={categories}
                    onClose={() => setEditing(null)}
                    onSave={save}
                    onDelete={remove}
                />
            )}

            {managing && role === "owner" && (
                <CategoriesManager
                    slug={slug}
                    categories={categories}
                    onClose={() => setManaging(false)}
                    onChanged={(fresh) => {
                        setCategories(fresh);
                        if (filter !== ALL && filter !== OTHER && !fresh.some((c) => c._id === filter)) setFilter(ALL);
                        load(); // a deleted category's dishes are now Other
                    }}
                />
            )}
        </div>
    );
}
