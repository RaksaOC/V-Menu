import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { http, HttpResponse } from "msw";
import { server } from "../msw";

// VM-20: the dashboards show who is really signed in, and the cashier page renders on the server.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/restaurant/components/Overview", () => ({ default: () => <p>overview section</p> }));
vi.mock("@/features/restaurant/components/Menu", () => ({ default: () => <p>menu section</p> }));
vi.mock("@/features/restaurant/components/Tables", () => ({ default: () => <p>tables section</p> }));
vi.mock("@/features/cashier/components/orders/Orders", () => ({ default: () => <p>orders section</p> }));

import OwnerDashboard from "@/features/owner/components/OwnerDashboard";
import CashierDashboard from "@/features/cashier/components/CashierDashboard";

const me = (name: string, email: string, role: string) => http.get("*/api/auth/me", () => HttpResponse.json({ name, email, role }));
afterEach(() => vi.unstubAllGlobals());

describe("the owner header (VM-20)", () => {
    it("shows the owner's real name and email, not a placeholder", async () => {
        server.use(
            me("Ory Chan", "ory@x.test", "owner"),
            http.get("*/api/restaurants", () => HttpResponse.json([])),
        );
        render(<OwnerDashboard />);
        expect(await screen.findByText("Ory Chan")).toBeTruthy();
        expect(screen.getAllByText("ory@x.test").length).toBeGreaterThan(0);
        expect(screen.queryByText("John Doe")).toBeNull();
        expect(screen.queryByText("owner@gmail.com")).toBeNull();
    });

    it("the phone menu shows the real name too", async () => {
        server.use(
            me("Ory Chan", "ory@x.test", "owner"),
            http.get("*/api/restaurants", () => HttpResponse.json([])),
        );
        render(<OwnerDashboard />);
        await screen.findByText("Ory Chan");
        await userEvent.setup().click(screen.getByRole("button", { name: "Open the menu" }));
        expect((await screen.findAllByText("Ory Chan")).length).toBe(2);
        expect(screen.queryByText("John Doe")).toBeNull();
    });

    it("shows no made-up person while loading, or if the call fails", async () => {
        server.use(
            http.get("*/api/auth/me", () => HttpResponse.json({ message: "down" }, { status: 503 })),
            http.get("*/api/restaurants", () => HttpResponse.json([])),
        );
        render(<OwnerDashboard />);
        expect(await screen.findByText("Owner")).toBeTruthy();
        expect(screen.queryByText("John Doe")).toBeNull();
        expect(screen.queryByText("owner@gmail.com")).toBeNull();
    });
});

describe("the cashier dashboard (VM-20)", () => {
    it("shows the signed-in cashier", async () => {
        server.use(me("Dara Sok", "dara@x.test", "cashier"));
        render(<CashierDashboard />);
        expect(await screen.findByText("Dara Sok")).toBeTruthy();
        expect(screen.queryByText("cashier@restaurants.com")).toBeNull();
    });

    it("renders on the server, where there's no localStorage", () => {
        vi.stubGlobal("localStorage", undefined);
        expect(() => renderToString(<CashierDashboard />)).not.toThrow();
    });

    it("still reopens the section you were on", async () => {
        localStorage.setItem("dashboardSection", "menu");
        server.use(me("Dara Sok", "dara@x.test", "cashier"));
        render(<CashierDashboard />);
        expect(await screen.findByText("menu section")).toBeTruthy();
        expect(screen.queryByText("overview section")).toBeNull();
    });
});
