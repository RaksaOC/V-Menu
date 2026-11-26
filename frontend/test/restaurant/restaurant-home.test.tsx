import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-32: /<slug> is a simple, real page instead of a template with invented dishes and reviews.
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), usePathname: () => "/demo-bistro" }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
const { default: Page } = await import("@/app/[res]/page");
const { applyTheme, DARK_READY } = await import("@/theme/ThemeSync");

const LOOKUP = "*/api/restaurants/demo-bistro/public";

describe("the restaurant's page (VM-32)", () => {
    it("shows the real name, how to order, and the staff links", async () => {
        server.use(http.get(LOOKUP, () => HttpResponse.json({ name: "Demo Bistro", slug: "demo-bistro" })));
        render(<Page />);
        expect(await screen.findByRole("heading", { level: 1, name: "Demo Bistro" })).toBeInTheDocument();
        expect(screen.getByText("Scan the QR code on your table to order")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Cashier login" })).toHaveAttribute("href", "/demo-bistro/cashier/login");
        expect(screen.getByRole("link", { name: "Kitchen login" })).toHaveAttribute("href", "/demo-bistro/kitchen/login");
        await waitFor(() => expect(document.title).toBe("Demo Bistro"));
    });

    it("has none of the template's invented content", async () => {
        server.use(http.get(LOOKUP, () => HttpResponse.json({ name: "Demo Bistro", slug: "demo-bistro" })));
        const { container } = render(<Page />);
        await screen.findByRole("heading", { level: 1, name: "Demo Bistro" });
        expect(container.textContent).not.toMatch(/Signature Dishes|What Our Guests Say/);
    });

    it("an unknown restaurant says so, with no staff links", async () => {
        server.use(http.get(LOOKUP, () => HttpResponse.json({ code: "RESTAURANT_NOT_FOUND", message: "Not found" }, { status: 404 })));
        render(<Page />);
        expect(await screen.findByRole("heading", { name: "We couldn't find this restaurant" })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Cashier login" })).not.toBeInTheDocument();
    });

    it("a server error offers Try again, which loads the page", async () => {
        let up = false;
        server.use(
            http.get(LOOKUP, () =>
                up
                    ? HttpResponse.json({ name: "Demo Bistro", slug: "demo-bistro" })
                    : HttpResponse.json({ message: "Down" }, { status: 503 }),
            ),
        );
        render(<Page />);
        const retry = await screen.findByRole("button", { name: "Try again" });
        up = true;
        fireEvent.click(retry);
        expect(await screen.findByRole("heading", { level: 1, name: "Demo Bistro" })).toBeInTheDocument();
    });

    it("the placeholder tenant page and the template are gone", () => {
        const src = join(__dirname, "..", "..", "src");
        expect(existsSync(join(src, "app", "[res]", "tenant", "page.tsx"))).toBe(false);
        expect(existsSync(join(src, "components", "marketing", "RestaurantLanding.tsx"))).toBe(false);
    });
});

describe("dark mode on the restaurant's page (VM-32)", () => {
    const paintedDark = new Function("p", `return ${DARK_READY}`) as (p: string) => boolean;

    it.each([
        ["/demo-bistro", true],
        ["/", true],
        ["/login", true],
        ["/demo-bistro/cashier/login", true],
        ["/owner", true], // VM-35: the dashboards have dark styles now
        ["/demo-bistro/customer/T1", true], // VM-33: the customer's pages have dark styles now
        ["/demo-bistro/cashier/dashboard", true], // VM-35
    ])("%s: dark is %s, before first paint and after navigation", (path, dark) => {
        localStorage.setItem("vm-theme", "dark");
        expect(paintedDark(path)).toBe(dark);
        applyTheme(path);
        expect(document.documentElement.dataset.theme).toBe(dark ? "dark" : "light");
    });
});
