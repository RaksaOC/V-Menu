import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-03: an ended session sends staff back to their login page with a clear message, and the
// kitchen shows when it can't reach the server instead of silently showing old orders.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));

const { default: api } = await import("@/lib/api");
const { loginPathFor, navigation } = await import("@/lib/session");
const { default: KitchenBoard } = await import("@/features/kitchen/components/KitchenBoard");
const { default: KitchenLogin } = await import("@/features/auth/components/KitchenLogin");

const at = (path: string) => window.history.pushState({}, "", path);
afterEach(() => at("/"));

describe("loginPathFor", () => {
    it("finds each role's login page from the current page", () => {
        expect(loginPathFor("/demo-bistro/kitchen")).toBe("/demo-bistro/kitchen/login");
        expect(loginPathFor("/demo-bistro/kitchen/history")).toBe("/demo-bistro/kitchen/login");
        expect(loginPathFor("/demo-bistro/cashier/dashboard")).toBe("/demo-bistro/cashier/login");
        expect(loginPathFor("/owner")).toBe("/owner/login");
        expect(loginPathFor("/demo-bistro/customer/T1")).toBeNull();
    });
});

describe("a 401 from the API", () => {
    it("clears the token and goes to the role's login page with ?expired=1", async () => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        at("/demo-bistro/kitchen");
        localStorage.setItem("token", "old.token.here");
        server.use(http.get("*/api/orders/demo-bistro/kitchen", () => HttpResponse.json({ message: "Session expired" }, { status: 401 })));
        await expect(api.get("/api/orders/demo-bistro/kitchen")).rejects.toThrow();
        expect(localStorage.getItem("token")).toBeNull();
        expect(go).toHaveBeenCalledWith("/demo-bistro/kitchen/login?expired=1");
    });

    it("does not redirect from a customer page, or for a wrong password at login", async () => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        server.use(
            http.get("*/api/menu/demo-bistro/public/items", () => HttpResponse.json({}, { status: 401 })),
            http.post("*/api/auth/login", () => HttpResponse.json({ message: "Wrong account" }, { status: 401 })),
        );
        at("/demo-bistro/customer/T1");
        await expect(api.get("/api/menu/demo-bistro/public/items")).rejects.toThrow();
        at("/demo-bistro/kitchen/login");
        await expect(api.post("/api/auth/login", {})).rejects.toThrow();
        expect(go).not.toHaveBeenCalled();
    });
});

describe("login page after a session ends", () => {
    it("says the session ended", () => {
        at("/demo-bistro/kitchen/login?expired=1");
        render(<KitchenLogin />);
        expect(screen.getByRole("status")).toHaveTextContent("Your session ended, please sign in again.");
    });

    it("says nothing on a normal visit", () => {
        at("/demo-bistro/kitchen/login");
        render(<KitchenLogin />);
        expect(screen.queryByText(/session ended/i)).not.toBeInTheDocument();
    });
});

describe("kitchen connection bar", () => {
    it("appears after 2 failed polls in a row and goes away on the next success", async () => {
        let fail = false;
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen", () => (fail ? HttpResponse.json({}, { status: 503 }) : HttpResponse.json([]))),
        );
        render(<KitchenBoard pollMs={40} />);
        await new Promise((r) => setTimeout(r, 100));
        expect(screen.queryByText(/connection lost/i)).not.toBeInTheDocument();
        fail = true;
        expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost, retrying…");
        fail = false;
        await waitFor(() => expect(screen.queryByText(/connection lost/i)).not.toBeInTheDocument());
    });
});
