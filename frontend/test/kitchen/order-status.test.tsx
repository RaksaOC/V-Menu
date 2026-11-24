import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-27: the kitchen board has New, Preparing and Ready columns, and one big button per card.
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro" }),
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => "/demo-bistro/kitchen",
}));
const { default: KitchenBoard } = await import("@/features/kitchen/components/KitchenBoard");

const dish = { _id: "665f00000000000000000aaa", name: "Kuy Teav", price: 2.5, image: "/k.jpg", isEnabled: true };
const order = (n: number, status: string) => ({
    _id: `665f00000000000000000${n}0${n}`,
    table: `T${n}`,
    status,
    statusHistory: [],
    createdAt: "2026-11-23T10:00:00Z",
    orderedItems: [{ item: dish, quantity: 1 }],
});
const column = (name: string) => screen.getByRole("region", { name });

describe("kitchen board columns", () => {
    it("shows each order in its column: New, Preparing, Ready", async () => {
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen", () =>
                HttpResponse.json([order(1, "pending"), order(2, "preparing"), order(3, "ready")]),
            ),
        );
        render(<KitchenBoard />);
        expect(await screen.findByRole("heading", { name: "Table T1" })).toBeTruthy();
        expect(within(column("New")).getByRole("heading", { name: "Table T1" })).toBeTruthy();
        expect(within(column("Preparing")).getByRole("heading", { name: "Table T2" })).toBeTruthy();
        expect(within(column("Ready")).getByRole("heading", { name: "Table T3" })).toBeTruthy();
    });

    it("one big button moves an order to the next column, and Served takes it off the board", async () => {
        const sent: unknown[] = [];
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen", () => HttpResponse.json([order(1, "pending")])),
            http.patch("*/api/orders/demo-bistro/kitchen/:id/status", async ({ request }) => {
                const body = (await request.json()) as { status: string };
                sent.push(body);
                return HttpResponse.json(order(1, body.status));
            }),
        );
        render(<KitchenBoard pollMs={60_000} />);
        fireEvent.click(await within(await waitFor(() => column("New"))).findByRole("button", { name: "Start preparing" }));
        await waitFor(() => expect(within(column("Preparing")).getByRole("heading", { name: "Table T1" })).toBeTruthy());
        fireEvent.click(within(column("Preparing")).getByRole("button", { name: "Mark ready" }));
        await waitFor(() => expect(within(column("Ready")).getByRole("heading", { name: "Table T1" })).toBeTruthy());
        fireEvent.click(within(column("Ready")).getByRole("button", { name: "Mark served" }));
        await waitFor(() => expect(screen.queryByRole("heading", { name: "Table T1" })).toBeNull());
        expect(sent).toEqual([{ status: "preparing" }, { status: "ready" }, { status: "served" }]);
    });
});
