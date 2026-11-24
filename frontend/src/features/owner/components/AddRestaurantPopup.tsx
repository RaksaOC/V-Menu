"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Input, Modal } from "@/components/ui";

interface Props {
    onClose: () => void;
    onSave: (name: string) => void;
}

/** Add a restaurant, in the shared Modal (CL-09). */
export function AddRestaurantPopup({ onClose, onSave }: Props) {
    const formId = useId();
    const [name, setName] = useState("");
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
    };
    return (
        <Modal
            title="Add Restaurant"
            onClose={onClose}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} disabled={!name.trim()}>
                        Add Restaurant
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={submit}>
                <Input label="Restaurant name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Burger House" />
            </form>
        </Modal>
    );
}
