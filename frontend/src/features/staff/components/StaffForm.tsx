"use client";

import { useId, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import type { AddStaffBody, StaffMember } from "@vmenu/contracts";

type Role = "cashier" | "chef";

interface Props {
    /** Without a member the form invites one (VM-12); with a member it edits or removes them. */
    member?: StaffMember;
    /** The server's answer about the email, e.g. this person already has that role here. */
    emailError?: string;
    /** The server's answer about the role: this person already has it here (VM-18). */
    roleError?: string;
    onClose: () => void;
    onAdd?: (input: AddStaffBody) => void;
    onSave?: (member: StaffMember) => void;
    onDelete?: (id: string) => void;
}

/** Where staff sign in. The form only opens in the browser, so the full address is known. */
const loginUrl = () => (typeof window === "undefined" ? "/login" : `${window.location.origin}/login`);

/** Add and edit a staff member, in the shared Modal (CL-09; was AddStaffPopUp and EditStaffPopUp). */
export default function StaffForm({ member, emailError = "", roleError = "", onClose, onAdd, onSave, onDelete }: Props) {
    const formId = useId();
    const roleId = useId();
    const [name, setName] = useState(member?.name ?? "");
    const [email, setEmail] = useState(member?.email ?? "");
    const [role, setRole] = useState<Role | "">(member && member.role !== "owner" ? member.role : "");
    const [tried, setTried] = useState(false);
    // what was last sent: the server's errors are about those values
    const [sent, setSent] = useState("");
    const [sentRole, setSentRole] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const badEmail = !member && !/\S+@\S+\.\S+/.test(email);
    const errors = {
        name: !name.trim() ? "Name is required" : "",
        email: badEmail ? "Enter a valid email" : email === sent ? emailError : "",
        role: !role ? "Choose a role" : role === sentRole ? roleError : "",
    };
    const show = (key: keyof typeof errors) => (tried ? errors[key] || undefined : undefined);

    function submit(e: FormEvent) {
        e.preventDefault();
        setTried(true);
        if (errors.name || !role || badEmail) return;
        setSent(email);
        setSentRole(role);
        if (member) onSave?.({ ...member, name: name.trim(), role: role as Role });
        else onAdd?.({ name: name.trim(), email: email.trim(), role: role as Role });
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
                {member ? "Save Changes" : "Send invite"}
            </Button>
        </>
    );

    return (
        <Modal title={member ? `Edit ${member.name}` : "Invite Staff Member"} onClose={onClose} footer={footer}>
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
                    hint={member ? undefined : `Tell them to create an account or sign in at ${loginUrl()} with this email.`}
                />
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
