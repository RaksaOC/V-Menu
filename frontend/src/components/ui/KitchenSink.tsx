"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button, Card, Chip, ConnectionLostBar, Input, Modal, Skeleton, ToastHost, toast } from "@/components/ui";

/** Every UI kit component on one page, for review and screenshot tests in light and dark (CL-09). */
export default function KitchenSink() {
    const [open, setOpen] = useState(false);
    return (
        <main className="min-h-screen space-y-10 bg-[var(--stage)] p-6 text-[var(--ink)] md:p-10">
            <ToastHost />
            <header>
                <h1 className="text-3xl font-bold">V-Menu UI kit</h1>
                <p className="text-[var(--muted)]">components/ui, on the Deep Lab tokens. Switch the theme to check dark.</p>
            </header>

            <section aria-labelledby="buttons" className="space-y-3">
                <h2 id="buttons" className="text-xl font-semibold">
                    Button
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Button icon={<Plus size={16} aria-hidden />}>Primary</Button>
                    <Button variant="solid" icon={<Save size={16} aria-hidden />}>
                        Solid
                    </Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="danger" icon={<Trash2 size={16} aria-hidden />}>
                        Danger
                    </Button>
                    <Button loading>Loading</Button>
                    <Button disabled>Disabled</Button>
                    <Button size="sm" variant="outline">
                        Small
                    </Button>
                </div>
            </section>

            <section aria-labelledby="chips" className="space-y-3">
                <h2 id="chips" className="text-xl font-semibold">
                    Chip
                </h2>
                <div className="flex flex-wrap gap-2">
                    <Chip tone="ok">Available</Chip>
                    <Chip tone="bad">Closed</Chip>
                    <Chip tone="accent">New</Chip>
                    <Chip>Neutral</Chip>
                </div>
            </section>

            <section aria-labelledby="cards" className="space-y-3">
                <h2 id="cards" className="text-xl font-semibold">
                    Card and Input
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="space-y-4">
                        <Input label="Table name" placeholder="e.g. patio-2" />
                        <Input label="Email" defaultValue="taken@example.com" error="This email already has an account" />
                        <Input label="Disabled" defaultValue="Can't change this" disabled />
                    </Card>
                    <Card className="space-y-3">
                        <h3 className="font-semibold">Modal and toast</h3>
                        <p className="text-sm text-[var(--muted)]">
                            The modal closes with Escape, the close button or the backdrop, and keeps Tab inside.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button onClick={() => setOpen(true)}>Open modal</Button>
                            <Button variant="outline" onClick={() => toast.success("Saved")}>
                                Success toast
                            </Button>
                            <Button variant="outline" onClick={() => toast.error("Could not save")}>
                                Error toast
                            </Button>
                        </div>
                    </Card>
                </div>
            </section>

            <section aria-labelledby="skeletons" className="space-y-3">
                <h2 id="skeletons" className="text-xl font-semibold">
                    Skeleton
                </h2>
                <Skeleton variant="table" count={2} />
                <Skeleton variant="menu" count={2} />
            </section>

            <section aria-labelledby="bar" className="space-y-3">
                <h2 id="bar" className="text-xl font-semibold">
                    Connection bar
                </h2>
                <ConnectionLostBar />
            </section>

            {open && (
                <Modal
                    title="Edit Table T1"
                    onClose={() => setOpen(false)}
                    footer={
                        <>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => setOpen(false)}>Save Changes</Button>
                        </>
                    }
                >
                    <Input label="Table name" defaultValue="t1" />
                </Modal>
            )}
        </main>
    );
}
