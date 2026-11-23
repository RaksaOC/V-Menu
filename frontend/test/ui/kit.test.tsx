import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

// CL-09: the small UI kit in components/ui, on the Deep Lab tokens.
const toastify = vi.hoisted(() => ({ ToastContainer: vi.fn(() => null) }));
vi.mock("react-toastify", () => ({ ToastContainer: toastify.ToastContainer, toast: {} }));

const { Button, Card, Chip, Input, Modal, Skeleton, ToastHost } = await import("@/components/ui");

describe("Button", () => {
    it("renders each variant and runs onClick from the mouse and the keyboard", async () => {
        const onClick = vi.fn();
        render(
            <>
                <Button onClick={onClick}>Save</Button>
                <Button variant="solid">Solid</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="danger">Delete</Button>
            </>,
        );
        const save = screen.getByRole("button", { name: "Save" });
        expect(save).toHaveAttribute("data-variant", "primary");
        expect(screen.getByRole("button", { name: "Outline" })).toHaveAttribute("data-variant", "outline");
        await userEvent.click(save);
        save.focus();
        await userEvent.keyboard("{Enter}");
        await userEvent.keyboard(" ");
        expect(onClick).toHaveBeenCalledTimes(3);
        expect(save).toHaveAttribute("type", "button"); // never submits a form by accident
    });

    it("does nothing while disabled or loading", async () => {
        const onClick = vi.fn();
        render(
            <>
                <Button disabled onClick={onClick}>Off</Button>
                <Button loading onClick={onClick}>Saving</Button>
            </>,
        );
        await userEvent.click(screen.getByRole("button", { name: "Off" }));
        const busy = screen.getByRole("button", { name: /Saving/ });
        expect(busy).toBeDisabled();
        expect(busy).toHaveAttribute("aria-busy", "true");
        await userEvent.click(busy);
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe("Card and Chip", () => {
    it("renders a card as any element", () => {
        render(<Card as="section" aria-label="Stats">Inside</Card>);
        expect(screen.getByRole("region", { name: "Stats" })).toHaveTextContent("Inside");
    });

    it("renders a chip with its tone", () => {
        render(<Chip tone="ok">Available</Chip>);
        expect(screen.getByText("Available")).toHaveAttribute("data-tone", "ok");
    });
});

describe("Input", () => {
    it("has a label, and links its error to the field", async () => {
        render(<Input label="Table name" error="Table name is taken." defaultValue="T1" />);
        const field = screen.getByLabelText("Table name");
        expect(field).toHaveAttribute("aria-invalid", "true");
        expect(field).toHaveAccessibleDescription("Table name is taken.");
        await userEvent.type(field, "2");
        expect(field).toHaveValue("T12");
    });

    it("can't be typed in when disabled", async () => {
        render(<Input label="Email" disabled defaultValue="a@b.c" />);
        await userEvent.type(screen.getByLabelText("Email"), "x");
        expect(screen.getByLabelText("Email")).toHaveValue("a@b.c");
    });
});

describe("Modal", () => {
    function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
        const [open, setOpen] = useState(false);
        return (
            <>
                <button onClick={() => setOpen(true)}>Open</button>
                {open && (
                    <Modal
                        title="Edit table"
                        onClose={() => {
                            onClose();
                            setOpen(false);
                        }}
                        footer={<Button>Save</Button>}
                    >
                        <Input label="Name" />
                    </Modal>
                )}
            </>
        );
    }

    it("is a labelled dialog that starts with focus inside", async () => {
        render(<Harness />);
        await userEvent.click(screen.getByRole("button", { name: "Open" }));
        const dialog = screen.getByRole("dialog", { name: "Edit table" });
        expect(dialog).toHaveAttribute("aria-modal", "true");
        expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it("keeps Tab and Shift+Tab inside, and closes with Escape, giving focus back", async () => {
        const onClose = vi.fn();
        render(<Harness onClose={onClose} />);
        const opener = screen.getByRole("button", { name: "Open" });
        await userEvent.click(opener);
        const dialog = screen.getByRole("dialog");
        for (let i = 0; i < 6; i++) {
            await userEvent.tab();
            expect(dialog.contains(document.activeElement)).toBe(true);
        }
        for (let i = 0; i < 6; i++) {
            await userEvent.tab({ shift: true });
            expect(dialog.contains(document.activeElement)).toBe(true);
        }
        await userEvent.keyboard("{Escape}");
        expect(onClose).toHaveBeenCalledOnce();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(opener).toHaveFocus();
    });

    it("closes from the close button and a click on the backdrop, not a click inside", async () => {
        const onClose = vi.fn();
        render(<Harness onClose={onClose} />);
        await userEvent.click(screen.getByRole("button", { name: "Open" }));
        await userEvent.click(screen.getByLabelText("Name"));
        expect(onClose).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
        await userEvent.click(screen.getByRole("button", { name: "Open" }));
        await userEvent.click(screen.getByTestId("modal-backdrop"));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

describe("Skeleton", () => {
    it("shows the requested number of placeholders for each variant, marked as loading", () => {
        for (const variant of ["menu", "order", "overview", "table"] as const) {
            const { unmount } = render(<Skeleton variant={variant} count={3} />);
            const status = screen.getByRole("status", { name: "Loading" });
            expect(status.querySelectorAll("[data-skeleton]")).toHaveLength(3);
            unmount();
        }
    });
});

describe("ToastHost", () => {
    it("is the one place toasts are shown, with the shared position", () => {
        render(<ToastHost />);
        expect(toastify.ToastContainer).toHaveBeenCalledWith(expect.objectContaining({ position: "top-center" }), undefined);
    });
});
