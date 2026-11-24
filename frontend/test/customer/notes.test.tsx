import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-28: the customer adds a note to a cart line ("no chilli") and to the order; the kitchen sees them.
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro", table: "1" }), useRouter: () => ({ push, back: vi.fn() }) }));
const { default: CartPage } = await import("@/features/customer/components/CartPage");
const { default: KitchenCard } = await import("@/features/kitchen/components/OrderCard");
const { addToCart, readCart, saveCart, toOrderBody } = await import("@/features/customer/cart");

const KEY = "cart:demo-bistro:1";
const dish = { _id: "665f00000000000000000011", name: "Fish Amok", image: "/a.jpg", isEnabled: true, priceCents: 550 };

describe("notes in the cart (VM-28)", () => {
    it("a note typed on a line is kept in the cart, at most 100 characters", () => {
        localStorage.setItem(KEY, JSON.stringify([{ item: dish, quantity: 1 }]));
        render(<CartPage />);
        const note = screen.getByRole("textbox", { name: "Note for Fish Amok" });
        expect(note.getAttribute("maxlength")).toBe("100");
        fireEvent.change(note, { target: { value: "no chilli" } });
        expect(readCart("demo-bistro", "1")[0].note).toBe("no chilli");
    });

    it("the same dish again: it adds to a line without a note, and starts a new line next to one with a note", () => {
        saveCart("demo-bistro", "1", [{ item: dish, quantity: 1 }]);
        addToCart("demo-bistro", "1", { item: dish, quantity: 1 });
        expect(readCart("demo-bistro", "1").map((l) => l.quantity)).toEqual([2]);
        saveCart("demo-bistro", "1", [{ item: dish, quantity: 1, note: "no chilli" }]);
        addToCart("demo-bistro", "1", { item: dish, quantity: 1 });
        expect(readCart("demo-bistro", "1").map((l) => [l.quantity, l.note])).toEqual([
            [1, "no chilli"],
            [1, undefined],
        ]);
    });

    it("the order sends each line's note and the order's note", async () => {
        localStorage.setItem(
            KEY,
            JSON.stringify([
                { item: dish, quantity: 1, note: "no chilli" },
                { item: dish, quantity: 2 },
            ]),
        );
        const sent: unknown[] = [];
        server.use(
            http.post("*/api/orders/demo-bistro", async ({ request }) => {
                sent.push(await request.json());
                return HttpResponse.json({ _id: "665f00000000000000000099" }, { status: 201 });
            }),
        );
        render(<CartPage />);
        const orderNote = screen.getByRole("textbox", { name: "Note for the kitchen" });
        expect(orderNote.getAttribute("maxlength")).toBe("200");
        fireEvent.change(orderNote, { target: { value: "birthday" } });
        fireEvent.click(screen.getAllByRole("button", { name: /place order/i })[0]);
        await waitFor(() => expect(sent).toHaveLength(1));
        expect(sent[0]).toEqual({
            table: "1",
            note: "birthday",
            orderedItems: [
                { item: { _id: dish._id }, quantity: 1, note: "no chilli" },
                { item: { _id: dish._id }, quantity: 2 },
            ],
        });
    });

    it("toOrderBody leaves out empty notes", () => {
        expect(toOrderBody({ token: null, name: "1" }, [{ item: dish, quantity: 1, note: "  " }], " ")).toEqual({
            table: "1",
            orderedItems: [{ item: { _id: dish._id }, quantity: 1 }],
        });
    });

    it("toOrderBody sends the link token instead of the table's name, with the notes (SEC-04)", () => {
        const token = "AbCdEfGhIjKlMnOpQrSt_-";
        expect(toOrderBody({ token, name: "" }, [{ item: dish, quantity: 1, note: "no chilli" }], "birthday")).toEqual({
            qrToken: token,
            note: "birthday",
            orderedItems: [{ item: { _id: dish._id }, quantity: 1, note: "no chilli" }],
        });
    });
});

describe("notes on the kitchen card (VM-28)", () => {
    const order = {
        _id: "665f00000000000000000101",
        table: "T1",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        note: "Birthday, bring a candle",
        orderedItems: [
            { item: dish, quantity: 1, note: "No chilli" },
            { item: dish, quantity: 2 },
        ],
    };

    it("shows each line's note under the dish, highlighted in the accent colour", () => {
        render(<KitchenCard order={order} />);
        const note = screen.getByText("No chilli");
        expect(note.className).toContain("var(--accent)");
        expect(screen.getAllByText("Fish Amok")).toHaveLength(2); // two lines, not merged
    });

    it("shows the order's note, highlighted", () => {
        render(<KitchenCard order={order} />);
        expect(screen.getByText("Birthday, bring a candle").closest("[data-note]")).toBeTruthy();
    });
});
