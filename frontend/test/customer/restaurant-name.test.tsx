import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-21: the customer sees the restaurant's name, in the heading and the browser tab, not its slug.
const params = vi.hoisted(() => ({ res: "mee-keav-abc123", table: "4" }));
vi.mock("next/navigation", () => ({ useParams: () => params, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
const { default: CustomerMenu } = await import("@/features/customer/components/CustomerMenu");

const dish = { _id: "i1", name: "Fish Amok", price: 5.5, image: "/images/img.png", isEnabled: true };

function api(restaurant: () => Response) {
    server.use(
        http.get("*/api/restaurants/mee-keav-abc123/public", restaurant),
        http.get("*/api/menu/mee-keav-abc123/public/tables/:t", () => HttpResponse.json({ message: "Table is available" })),
        http.get("*/api/menu/mee-keav-abc123/public/items", () =>
            HttpResponse.json({ categories: [{ _id: null, name: "Other", items: [dish] }] }),
        ),
    );
}

describe("the restaurant's name on the customer menu (VM-21)", () => {
    beforeEach(() => {
        document.title = "V-Menu";
    });

    it("shows the name in the heading and the tab title, not the slug", async () => {
        api(() => HttpResponse.json({ name: "Mee Keav", slug: "mee-keav-abc123" }));
        render(<CustomerMenu />);
        expect(await screen.findByRole("heading", { level: 1, name: "Mee Keav" })).toBeInTheDocument();
        await waitFor(() => expect(document.title).toBe("Mee Keav · Table 4"));
        expect(screen.queryByText("mee-keav-abc123")).not.toBeInTheDocument();
    });

    it("if the name can't be loaded, the menu still works and the slug is never shown", async () => {
        api(() => HttpResponse.json({ message: "We're having trouble right now. Please try again in a moment." }, { status: 503 }));
        render(<CustomerMenu />);
        expect(await screen.findByText("Fish Amok")).toBeInTheDocument();
        expect(await screen.findByRole("heading", { level: 1, name: "Menu" })).toBeInTheDocument();
        expect(screen.queryByText("mee-keav-abc123")).not.toBeInTheDocument();
        await waitFor(() => expect(document.title).toBe("Menu · Table 4"));
    });
});
