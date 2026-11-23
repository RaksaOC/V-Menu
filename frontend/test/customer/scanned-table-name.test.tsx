import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
// Next's own helper that turns a route param into the value useParams() returns.
import { getDynamicParam } from "next/dist/shared/lib/router/utils/get-dynamic-param";
import { server } from "../msw";

// VM-01: a QR code for a table whose name has a space ("Patio 2") opens /<slug>/customer/Patio%202.
// Next 15 hands that segment to useParams() still URL-encoded, so the page has to decode it once.
// The value is taken from Next itself, so this test follows Next if that ever changes.
const scanned = getDynamicParam({ table: "Patio 2" }, "table", "d", "/[res]/customer/[table]", null).value as string;

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));
const params = vi.hoisted(() => ({ res: "demo-bistro", table: "" }));
vi.mock("next/navigation", () => ({ useParams: () => params, useRouter: () => router }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast }));

const { default: CustomerMenu } = await import("@/features/customer/components/CustomerMenu");
const { default: CartPage } = await import("@/features/customer/components/CartPage");

const dish = { _id: "665f00000000000000000011", name: "Fish Amok", price: 5.5, image: "/images/img.png", isEnabled: true };

describe("a scanned table name with a space", () => {
    it("is what Next gives the page: still encoded", () => {
        expect(scanned).toBe("Patio%202");
    });

    it("opens that table's menu and shows its real name", async () => {
        params.table = scanned;
        const checked: string[] = [];
        server.use(
            http.get("*/api/menu/demo-bistro/public/tables/:t", ({ params: p }) => {
                checked.push(String(p.t));
                return String(p.t) === "Patio 2" ? HttpResponse.json({ message: "Table is available" }) : HttpResponse.json({ code: "TABLE_NOT_FOUND" }, { status: 404 });
            }),
            http.get("*/api/menu/demo-bistro/public/items", () => HttpResponse.json([dish])),
        );
        render(<CustomerMenu />);
        expect(await screen.findByText("Fish Amok")).toBeInTheDocument();
        expect(checked).toEqual(["Patio 2"]);
        expect(screen.getByText("Table Patio 2")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /view cart/i }).getAttribute("href")).toBe("/demo-bistro/customer/Patio%202/cart");
    });

    it("sends the order to the table by its real name", async () => {
        params.table = scanned;
        localStorage.setItem("cart:demo-bistro:Patio 2", JSON.stringify([{ item: dish, quantity: 1 }]));
        let table: string | undefined;
        server.use(
            http.post("*/api/orders/demo-bistro", async ({ request }) => {
                table = ((await request.json()) as { table: string }).table;
                return HttpResponse.json({ _id: "o1" }, { status: 201 });
            }),
        );
        render(<CartPage />);
        await screen.findByText("Fish Amok");
        fireEvent.click(screen.getByRole("button", { name: /place order/i }));
        await waitFor(() => expect(table).toBe("Patio 2"));
    });

    it("keeps a name that isn't valid encoding as it is", async () => {
        params.table = "100%";
        const checked: string[] = [];
        server.use(
            http.get("*/api/menu/demo-bistro/public/tables/:t", ({ params: p }) => {
                checked.push(String(p.t));
                return HttpResponse.json({ message: "Table is available" });
            }),
            http.get("*/api/menu/demo-bistro/public/items", () => HttpResponse.json([dish])),
        );
        render(<CustomerMenu />);
        expect(await screen.findByText("Fish Amok")).toBeInTheDocument();
        expect(checked).toEqual(["100%"]);
    });
});
