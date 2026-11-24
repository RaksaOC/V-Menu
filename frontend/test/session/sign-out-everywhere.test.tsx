import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

// SEC-03: "Sign out everywhere" ends every session of this account, on every device.
const firebaseSignOut = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("firebase/auth", () => ({ signOut: firebaseSignOut }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));

import DashboardHeader from "@/components/layout/DashboardHeader";
import { ToastHost } from "@/components/ui";
import { navigation } from "@/lib/session";
import { server } from "../msw";

async function pressIt() {
    render(
        <>
            <ToastHost />
            <DashboardHeader title="V-Menu Cashier" roleLabel="Cashier" email="dara@x.test" loginHref="/demo-bistro/cashier/login" />
        </>,
    );
    const ui = userEvent.setup();
    await ui.click(screen.getByRole("button", { name: /cashier/i }));
    await ui.click(await screen.findByRole("menuitem", { name: "Sign out everywhere" }));
}

describe("Sign out everywhere (SEC-03)", () => {
    beforeEach(() => {
        firebaseSignOut.mockClear();
        // the dropdown measures itself; jsdom has no ResizeObserver
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        );
    });
    afterEach(() => vi.unstubAllGlobals());

    it("asks the server, signs out here, and goes to the login page", async () => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        let asked = 0;
        server.use(
            http.post("*/api/auth/sign-out-everywhere", () => {
                asked += 1;
                return HttpResponse.json({ message: "Signed out everywhere" });
            }),
            http.post("*/api/auth/logout", () => HttpResponse.json({ message: "Signed out" })),
        );
        await pressIt();
        await waitFor(() => expect(go).toHaveBeenCalledWith("/demo-bistro/cashier/login"));
        expect(asked).toBe(1);
        expect(firebaseSignOut).toHaveBeenCalled();
    });

    it("says so if it failed, and stays signed in", async () => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        server.use(http.post("*/api/auth/sign-out-everywhere", () => HttpResponse.json({ message: "down" }, { status: 503 })));
        await pressIt();
        expect(await screen.findByText("Couldn't sign out everywhere. Try again.")).toBeTruthy();
        expect(go).not.toHaveBeenCalled();
        expect(firebaseSignOut).not.toHaveBeenCalled();
    });
});
