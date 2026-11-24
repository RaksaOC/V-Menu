"use client";

import { useId, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import type { AddStaffBody, StaffMember } from "@vmenu/contracts";

/** A new member as the form collects them: the password goes to Firebase, the rest to the API. */
export type NewStaffMember = AddStaffBody & { password: string };

type Role = "cashier" | "chef";

interface Props {
    /** Without a member the form adds one (with a password); with a member it edits or removes them. */
    member?: StaffMember;
    /** Set by the page when Firebase says the email already has an account. */
    emailTaken?: boolean;
    onClose: () => void;
    onAdd?: (input: NewStaffMember) => void;
    onSave?: (member: StaffMember) => void;
    onDelete?: (id: string) => void;
}

/** Add and edit a staff member, in the shared Modal (CL-09; was AddStaffPopUp and EditStaffPopUp). */
export default function StaffForm({ member, emailTaken = false, onClose, onAdd, onSave, onDelete }: Props) {
    const formId = useId();
    const roleId = useId();
    const [name, setName] = useState(member?.name ?? "");
    const [email, setEmail] = useState(member?.email ?? "");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<Role | "">(member && member.role !== "owner" ? member.role : "");
    const [tried, setTried] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const errors = {
        name: !name.trim() ? "Name is required" : "",
        email: !member && !/\S+@\S+\.\S+/.test(email) ? "Enter a valid email" : emailTaken ? "This email already has an account" : "",
        password: !member && password.length < 6 ? "At least 6 characters" : "",
        role: !role ? "Choose a role" : "",
    };
    const show = (key: keyof typeof errors) => (tried || (key === "email" && emailTaken) ? errors[key] || undefined : undefined);

    function submit(e: FormEvent) {
        e.preventDefault();
        setTried(true);
        if (errors.name || errors.role || (!member && (errors.email || errors.password))) return;
        if (member) onSave?.({ ...member, name: name.trim(), role: role as Role });
        else onAdd?.({ name: name.trim(), email: email.trim(), password, role: role as Role, tenantId: "" });
    }

    const footer = confirmDelete ? (
        <>
            <p className="mr-auto self-center text-sm text-[var(--bad)]">Remove {member?.name}? They lose access to this restaurant.</p>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
            </Button>
            <Button variant="danger" onClick={() => member && onDelete?.(member._id)}>
                Remove
            </Button>
        </>
    ) : (
        <>
            {member && onDelete && (
                <Button
                    variant="outline"
                    className="mr-auto"
                    icon={<Trash2 size={16} aria-hidden />}
                    onClick={() => setConfirmDelete(true)}
                >
                    Remove
                </Button>
            )}
            <Button variant="outline" onClick={onClose}>
                Cancel
            </Button>
            <Button type="submit" form={formId}>
                {member ? "Save Changes" : "Add Staff"}
            </Button>
        </>
    );

    return (
        <Modal title={member ? `Edit ${member.name}` : "Add Staff Member"} onClose={onClose} footer={footer}>
            <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" error={show("name")} />
                <Input
                    label="Email"
                    type="email"
                    value={email}
                    disabled={!!member}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. staff@example.com"
                    error={show("email")}
                />
                {!member && (
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        error={show("password")}
                    />
                )}
                <div className="space-y-1.5">
                    <label htmlFor={roleId} className="block text-sm font-semibold">
                        Role
                    </label>
                    <select
                        id={roleId}
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role | "")}
                        aria-invalid={show("role") ? true : undefined}
                        className="w-full rounded-[var(--r-in)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                    >
                        <option value="">Select a role</option>
                        <option value="cashier">Cashier</option>
                        <option value="chef">Chef</option>
                    </select>
                    {show("role") && <p className="text-xs text-[var(--bad)]">{show("role")}</p>}
                </div>
            </form>
        </Modal>
    );
}
