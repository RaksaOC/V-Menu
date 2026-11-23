"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Printer, Table as TableIcon } from "lucide-react";
import { Button, Chip, Skeleton, toast } from "@/components/ui";
import { printQrCards } from "@/components/qr/print";
import { tableUrl } from "@/lib/tableUrl";
import { apiStatus } from "@/lib/api";
import { createTable, deleteTable, getTables, setTableAvailability, updateTable } from "@/features/restaurant/api";
import { useRestaurantSlug } from "@/features/restaurant/useRestaurantSlug";
import TableCard from "./TableCard";
import TableForm from "./TableForm";
import type { TableInput, TableOutput } from "@/lib/types/Table";

/**
 * A restaurant's tables (CL-09; was two copies). The owner adds, renames, deletes and prints QR
 * codes; the cashier opens and closes tables.
 */
export default function Tables({ role }: { role: "owner" | "cashier" }) {
    const slug = useRestaurantSlug();
    const [tables, setTables] = useState<TableOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<TableOutput | "new" | null>(null);

    const load = useCallback(async () => {
        if (!slug) return;
        try {
            setTables(await getTables(slug));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);

    async function toggle(table: TableOutput) {
        const isEnabled = !table.isEnabled;
        setTables((all) => all.map((t) => (t._id === table._id ? { ...t, isEnabled } : t)));
        try {
            await setTableAvailability(slug, table._id, isEnabled);
            toast.info(`Table ${table.name} ${isEnabled ? "opened" : "closed"}`);
        } catch {
            setTables((all) => all.map((t) => (t._id === table._id ? table : t)));
            toast.error(`Could not ${isEnabled ? "open" : "close"} table ${table.name}`);
        }
    }

    async function create(input: TableInput) {
        try {
            await createTable(slug, input);
            setEditing(null);
            await load();
        } catch {
            toast.error("Could not add the table");
        }
    }

    async function rename(id: string, name: string) {
        try {
            await updateTable(slug, id, { name });
            setEditing(null);
            await load();
            return "ok" as const;
        } catch (err) {
            return apiStatus(err) === 409 || apiStatus(err) === 400 ? ("taken" as const) : ("error" as const);
        }
    }

    async function remove(id: string) {
        try {
            await deleteTable(slug, id);
            setEditing(null);
            await load();
        } catch {
            toast.error("Could not delete the table");
        }
    }

    if (loading) return <Skeleton variant="table" count={4} />;

    const open = tables.filter((t) => t.isEnabled).length;
    return (
        <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--ink)]">{role === "owner" ? "Manage Tables" : "Tables"}</h2>
                    <p className="text-sm text-[var(--muted)]">
                        {role === "owner" ? "Add tables, rename them and print their QR codes" : "Open a table when guests sit down"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="ok">{open} open</Chip>
                    <Chip tone="neutral">{tables.length - open} closed</Chip>
                    {role === "owner" && tables.length > 0 && (
                        <Button
                            variant="outline"
                            icon={<Printer size={16} aria-hidden />}
                            onClick={() => printQrCards(tables.map((t) => ({ tableName: t.name, url: tableUrl(slug, t.name) })))}
                        >
                            Print all QR codes
                        </Button>
                    )}
                    {role === "owner" && (
                        <Button icon={<Plus size={16} aria-hidden />} onClick={() => setEditing("new")}>
                            Add Table
                        </Button>
                    )}
                </div>
            </div>

            {tables.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tables.map((table) =>
                        role === "owner" ? (
                            <TableCard key={table._id} role="owner" table={table} onEdit={setEditing} />
                        ) : (
                            <TableCard key={table._id} role="cashier" table={table} onToggle={toggle} />
                        ),
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center py-16 text-center text-[var(--muted)]">
                    <TableIcon size={40} aria-hidden className="mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--ink)]">No tables yet</h3>
                    <p className="mt-1 max-w-md text-sm">
                        {role === "owner" ? "Add your first table to print its QR code." : "Ask the owner to add the restaurant's tables."}
                    </p>
                </div>
            )}

            {editing && role === "owner" && (
                <TableForm
                    table={editing === "new" ? undefined : editing}
                    onClose={() => setEditing(null)}
                    onCreate={create}
                    onRename={rename}
                    onDelete={remove}
                />
            )}
        </div>
    );
}
