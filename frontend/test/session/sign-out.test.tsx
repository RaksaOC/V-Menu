import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

// SEC-01 (review follow-up): Sign Out only says you're signed out once the server has cleared the
// httpOnly cookie. Page scripts can't remove that cookie, and it stays a working session for up to
// 12 hours (VM-03), so a failed sign-out must say so and leave the person where they are.
const firebaseSignOut = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("firebase/auth", () => ({ signOut: firebaseSignOut }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));

import DashboardHeader from "@/components/layout/DashboardHeader";
import { ToastHost } from "@/components/ui";
import KitchenHistory from "@/features/kitchen/components/KitchenHistory";
import { navigation, signOut } from "@/lib/session";
import { server } from "../msw";

const FAILED = "Couldn't sign out, so you're still signed in. Please try again.";
const logout = (answer: () => Response) => server.use(http.post("*/api/auth/logout", answer));
const refused = () => HttpResponse.json({ message: "Too many requests" }, { status: 429 });
const ok = () => HttpResponse.json({ message: "Signed out" });

beforeEach(() => {
    firebaseSignOut.mockClear();
    localStorage.setItem("token", "kept");
    // the header's dropdown measures itself; jsdom has no ResizeObserver
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
});

describe("signOut() (SEC-01)", () => {
    it("is true once the server has cleared the cookie, and clears the rest", async () => {
        logout(ok);
        expect(await signOut()).toBe(true);
        expect(localStorage.getItem("token")).toBeNull();
        expect(firebaseSignOut).toHaveBeenCalled();
    });

    it.each([
        ["a 429 (rate limited)", refused],
        ["a 500", () => HttpResponse.json({ message: "down" }, { status: 500 })],
        ["no answer (offline)", () => HttpResponse.error()],
    ])("is false on %s, and changes nothing here", async (_name, answer) => {
        logout(answer);
        expect(await signOut()).toBe(false);
        expect(localStorage.getItem("token")).toBe("kept");
        expect(firebaseSignOut).not.toHaveBeenCalled();
    });
});

describe("the Sign Out buttons (SEC-01)", () => {
    async function headerSignOut() {
        render(
            <>
                <ToastHost />
                <DashboardHeader title="V-Menu Cashier" roleLabel="Cashier" email="dara@x.test" loginHref="/demo-bistro/cashier/login" />
            </>,
        );
        const ui = userEvent.setup();
        await ui.click(screen.getByRole("button", { name: /cashier/i }));
        await ui.click(await screen.findByRole("menuitem", { name: "Sign Out" }));
    }

    it("the dashboard header goes to the login page once signed out", async () => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        logout(ok);
        await headerSignOut();
        await waitFor(() => expect(go).toHaveBeenCalledWith("/demo-bistro/cashier/login"));
    });

    it("the dashboard header says so when it failed, and stays on the page", async () => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        logout(refused);
        await headerSignOut();
        expect(await screen.findByText(FAILED)).toBeTruthy();
        expect(go).not.toHaveBeenCalled();
    });

    it("the kitchen's Sign Out says so when it failed, stays, and can be pressed again", async () => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen/history", () =>
                HttpResponse.json({ orders: [], page: 1, limit: 20, total: 0, pages: 1 }),
            ),
        );
        logout(refused);
        render(<KitchenHistory />);
        const ui = userEvent.setup();
        await ui.click(screen.getByRole("button", { name: "Sign Out" }));
        expect(await screen.findByText(FAILED)).toBeTruthy();
        expect(go).not.toHaveBeenCalled();
        logout(ok);
        await ui.click(screen.getByRole("button", { name: "Sign Out" }));
        await waitFor(() => expect(go).toHaveBeenCalledWith("/demo-bistro/kitchen/login"));
    });
});
