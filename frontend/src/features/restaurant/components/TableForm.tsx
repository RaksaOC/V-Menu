"use client";

import { useId, useState, type FormEvent } from "react";
import { QrCode, Trash2 } from "lucide-react";
import type { CreateTableBody, Table } from "@vmenu/contracts";
import { Button, Input, Modal } from "@/components/ui";

/** What a save or delete came to; a string is the server's own reason (VM-15: an unpaid bill). */
type Result = "ok" | "taken" | "error" | { reason: string } | undefined;

const message = (result: Result) =>
    typeof result === "object"
        ? result.reason
        : result === "taken"
          ? "Table name is taken."
          : result === "error"
            ? "Could not save the table. Please try again."
            : "";

interface Props {
    /** Without a table the form adds one; with a table it renames or deletes it. */
    table?: Table;
    onClose: () => void;
    onCreate?: (table: CreateTableBody) => Promise<Result>;
    onRename?: (id: string, name: string) => Promise<Result>;
    onDelete?: (id: string) => Promise<Result>;
    /** SEC-04: gives the table a new QR link. */
    onResetQr?: (id: string) => void;
}

/** Add and edit a table, in the shared Modal (CL-09; was AddTablePopup and EditTablePopup). */
export default function TableForm({ table, onClose, onCreate, onRename, onDelete, onResetQr }: Props) {
    const formId = useId();
    const [auto, setAuto] = useState(true);
    const [name, setName] = useState(table?.name ?? "");
    const [error, setError] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
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

    async function remove() {
        if (!table) return;
        setSaving(true);
        const result = await onDelete?.(table._id);
        setSaving(false);
        setConfirmDelete(false);
        // VM-15: say why it wasn't deleted (an unpaid bill), and keep the popup open
        setDeleteError(result === "error" ? "Could not delete the table. Please try again." : message(result));
    }

    const footer = confirmReset ? (
        <>
            <p className="mr-auto self-center text-sm">
                Give table {table?.name} a new QR code? The old code stops working, so print the new one.
            </p>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
                Cancel
            </Button>
            <Button variant="solid" onClick={() => table && onResetQr?.(table._id)}>
                Yes, reset
            </Button>
        </>
    ) : confirmDelete ? (
        <>
            <p className="mr-auto self-center text-sm text-[var(--bad)]">Delete table {table?.name}? This can&apos;t be undone.</p>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={remove}>
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
                    onClick={() => {
                        setDeleteError("");
                        setConfirmDelete(true);
                    }}
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
                {deleteError && (
                    <p role="alert" className="text-sm text-[var(--bad)]">
                        {deleteError}
                    </p>
                )}
                {table && onResetQr && (
                    <div className="space-y-1.5 border-t border-[var(--line)] pt-4">
                        <Button variant="outline" icon={<QrCode size={16} aria-hidden />} onClick={() => setConfirmReset(true)}>
                            Reset QR code
                        </Button>
                        <p className="text-xs text-[var(--muted)]">If a printed code was taken, give the table a new one.</p>
                    </div>
                )}
            </form>
        </Modal>
    );
}
