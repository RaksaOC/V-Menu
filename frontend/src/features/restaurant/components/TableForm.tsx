"use client";

import { useId, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import type { CreateTableBody, Table } from "@vmenu/contracts";

type Result = "ok" | "taken" | "error" | undefined;

const message = (result: Result) =>
    result === "taken" ? "Table name is taken." : result === "error" ? "Could not save the table. Please try again." : "";

interface Props {
    /** Without a table the form adds one; with a table it renames or deletes it. */
    table?: Table;
    onClose: () => void;
    onCreate?: (table: CreateTableBody) => Promise<Result>;
    onRename?: (id: string, name: string) => Promise<Result>;
    onDelete?: (id: string) => void;
}

/** Add and edit a table, in the shared Modal (CL-09; was AddTablePopup and EditTablePopup). */
export default function TableForm({ table, onClose, onCreate, onRename, onDelete }: Props) {
    const formId = useId();
    const [auto, setAuto] = useState(true);
    const [name, setName] = useState(table?.name ?? "");
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [saving, setSaving] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (table) {
            if (!name.trim()) return setError("Table name is required.");
            setSaving(true);
            const result = await onRename?.(table._id, name.trim());
            setSaving(false);
            setError(message(result));
        } else {
            if (!auto && !name.trim()) return setError("Table name is required.");
            setSaving(true);
            const result = await onCreate?.({ name: auto ? "" : name.trim(), type: auto ? "auto" : "manual" }); // a new table starts closed (VM-04)
            setSaving(false);
            setError(message(result)); // VM-16: a taken name is said next to it, and the popup stays open
        }
    }

    const footer = confirmDelete ? (
        <>
            <p className="mr-auto self-center text-sm text-[var(--bad)]">Delete table {table?.name}? This can&apos;t be undone.</p>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
            </Button>
            <Button variant="danger" onClick={() => table && onDelete?.(table._id)}>
                Delete
            </Button>
        </>
    ) : (
        <>
            {table && onDelete && (
                <Button
                    variant="outline"
                    className="mr-auto"
                    icon={<Trash2 size={16} aria-hidden />}
                    onClick={() => setConfirmDelete(true)}
                >
                    Delete
                </Button>
            )}
            <Button variant="outline" onClick={onClose}>
                Cancel
            </Button>
            <Button type="submit" form={formId} loading={saving}>
                {table ? "Save Changes" : "Add Table"}
            </Button>
        </>
    );

    return (
        <Modal title={table ? `Edit Table ${table.name}` : "Add Table"} onClose={onClose} footer={footer} size="sm">
            <form id={formId} onSubmit={submit} className="space-y-5">
                {!table && (
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold">Name</legend>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="radio" name="kind" checked={auto} onChange={() => setAuto(true)} /> Next number
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="radio" name="kind" checked={!auto} onChange={() => setAuto(false)} /> Choose a name
                        </label>
                    </fieldset>
                )}
                {!table && auto && error && (
                    <p role="alert" className="text-sm text-[var(--bad)]">
                        {error}
                    </p>
                )}
                {(table || !auto) && (
                    <Input
                        label="Table name"
                        value={name}
                        maxLength={40}
                        error={error || undefined}
                        onChange={(e) => {
                            setName(table ? e.target.value : e.target.value.toLowerCase());
                            setError("");
                        }}
                        placeholder="e.g. patio-2"
                    />
                )}
            </form>
        </Modal>
    );
}
