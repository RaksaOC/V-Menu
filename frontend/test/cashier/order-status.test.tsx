import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OrderStatus } from "@vmenu/contracts";

// VM-27: the cashier's bill shows each order's status; cancelled lines are struck through and
// not charged; an order can be cancelled with a reason.
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
const { default: OrderCard } = await import("@/features/cashier/components/orders/OrderCard");

const dish = (name: string, price: number) => ({
    _id: `665f0000000000000000${name.length}${name.length}${name.length}${name.length}`.slice(0, 24),
    name,
    priceCents: Math.round(price * 100),
    image: "/x.jpg",
    isEnabled: true,
});
const order = (id: string, status: OrderStatus, line: ReturnType<typeof dish>, extra = {}) => ({
    _id: id,
    table: "T1",
    status,
    statusHistory: [],
    createdAt: "2026-11-23T10:00:00Z",
    orderedItems: [{ item: line, quantity: 2 }],
    ...extra,
});
const SERVED = order("665f00000000000000aaa111", "served", dish("Fish Amok", 5));
const CANCELLED = order("665f00000000000000bbb222", "cancelled", dish("Lok Lak", 4), { cancelReason: "Sent back" });
const PREPARING = order("665f00000000000000ccc333", "preparing", dish("Rice", 1));
const BILL = {
    _id: "665f00000000000000000b01",
    table: "T1",
    isPaid: false,
    createdAt: "2026-11-23T10:00:00Z",
    orders: [SERVED, CANCELLED, PREPARING],
};

describe("the cashier's bill", () => {
    it("shows each order's status, and strikes through a cancelled order with its reason", () => {
        render(<OrderCard order={BILL} onMarkPaid={vi.fn()} onCancelOrder={vi.fn()} />);
        expect(screen.getByText("Served")).toBeTruthy();
        expect(screen.getByText("Preparing")).toBeTruthy();
        expect(screen.queryByText("New")).toBeNull(); // pending reads "Ordered" here, not like the bill's NEW badge
        const struck = screen.getByRole("deletion");
        expect(within(struck).getByText("Lok Lak")).toBeTruthy();
        expect(screen.getByText(/Cancelled: Sent back/)).toBeTruthy();
    });

    it("the invoice leaves the cancelled order out", () => {
        render(<OrderCard order={BILL} onMarkPaid={vi.fn()} onCancelOrder={vi.fn()} />);
        fireEvent.click(screen.getByRole("button", { name: "View Invoice" }));
        const invoice = screen.getByRole("dialog");
        expect(within(invoice).queryByText("Lok Lak")).toBeNull();
        expect(within(invoice).getByText("$12.00")).toBeTruthy(); // 2 × 5 + 2 × 1
    });

    it("cancels an order with a reason, asking for one first", () => {
        const onCancel = vi.fn();
        render(<OrderCard order={BILL} onMarkPaid={vi.fn()} onCancelOrder={onCancel} />);
        expect(screen.queryByRole("button", { name: "Cancel order #BBB222" })).toBeNull(); // already cancelled
        fireEvent.click(screen.getByRole("button", { name: "Cancel order #CCC333" }));
        const reason = screen.getByRole("textbox", { name: "Why is it cancelled?" });
        fireEvent.click(screen.getByRole("button", { name: "Confirm cancel" }));
        expect(onCancel).not.toHaveBeenCalled(); // no reason yet
        fireEvent.change(reason, { target: { value: "Guest left" } });
        fireEvent.click(screen.getByRole("button", { name: "Confirm cancel" }));
        expect(onCancel).toHaveBeenCalledWith(BILL._id, PREPARING._id, "Guest left");
    });
});
