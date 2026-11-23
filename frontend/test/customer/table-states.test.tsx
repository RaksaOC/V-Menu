import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-04: the table page explains a closed table, an unknown restaurant and a server error itself,
// instead of redirecting to "Please scan the QR code" or spinning forever.
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const params = vi.hoisted(() => ({ res: "demo-bistro", table: "4" }));
vi.mock("next/navigation", () => ({ useParams: () => params, useRouter: () => router }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast }));
const { default: CustomerMenu } = await import("@/features/customer/components/CustomerMenu");

const dish = { _id: "i1", name: "Fish Amok", price: 5.5, image: "/images/img.png", isEnabled: true };
function api(table: () => Response, items: () => Response = () => HttpResponse.json([dish])) {
    server.use(http.get("*/api/menu/demo-bistro/public/tables/:t", table), http.get("*/api/menu/demo-bistro/public/items", items));
}

describe("customer table page states", () => {
    it("shows the menu for an open table", async () => {
        api(() => HttpResponse.json({ message: "Table is available" }));
        render(<CustomerMenu />);
        expect(await screen.findByText("Fish Amok")).toBeInTheDocument();
    });

    it("explains a closed table, on the page, without redirecting", async () => {
        api(() =>
            HttpResponse.json(
                { code: "TABLE_CLOSED", message: "Table 4 isn't open yet. Please ask a staff member to open it." },
                { status: 404 },
            ),
        );
        render(<CustomerMenu />);
        expect(await screen.findByRole("heading", { name: "Table 4 isn't open yet" })).toBeInTheDocument();
        expect(screen.getByText(/ask a staff member to open it/i)).toBeInTheDocument();
        expect(screen.queryByText(/scan the QR code/i)).not.toBeInTheDocument();
        expect(router.push).not.toHaveBeenCalled();
    });

    it("says when the restaurant doesn't exist", async () => {
        api(() => HttpResponse.json({ code: "RESTAURANT_NOT_FOUND", message: "We couldn't find this restaurant." }, { status: 404 }));
        render(<CustomerMenu />);
        expect(await screen.findByRole("heading", { name: "We couldn't find this restaurant" })).toBeInTheDocument();
        expect(router.push).not.toHaveBeenCalled();
    });

    it("says when the table doesn't exist", async () => {
        api(() => HttpResponse.json({ code: "TABLE_NOT_FOUND", message: "Table not found" }, { status: 404 }));
        render(<CustomerMenu />);
        expect(await screen.findByRole("heading", { name: "We couldn't find table 4" })).toBeInTheDocument();
    });

    it("offers Try again after a server error, and loads the menu when it works", async () => {
        let calls = 0;
        api(() =>
            ++calls === 1 ? HttpResponse.json({ message: "A required service is unavailable" }, { status: 503 }) : HttpResponse.json({}),
        );
        render(<CustomerMenu />);
        expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(await screen.findByText("Fish Amok")).toBeInTheDocument();
    });

    it("shows Try again when the menu itself fails to load, instead of endless skeletons", async () => {
        api(
            () => HttpResponse.json({}),
            () => HttpResponse.json({ message: "boom" }, { status: 500 }),
        );
        render(<CustomerMenu />);
        expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("removes cart lines whose dish left the menu, and says so (VM-05)", async () => {
        const gone = { ...dish, _id: "i9", name: "Old Special" };
        localStorage.setItem(
            "cart:demo-bistro:4",
            JSON.stringify([
                { item: dish, quantity: 1 },
                { item: gone, quantity: 2 },
            ]),
        );
        api(() => HttpResponse.json({}));
        render(<CustomerMenu />);
        await screen.findByText("Fish Amok");
        expect(toast.info).toHaveBeenCalledWith("1 item is no longer available and was removed from your cart.");
        expect(JSON.parse(localStorage.getItem("cart:demo-bistro:4")!)).toEqual([{ item: dish, quantity: 1 }]);
    });
});
