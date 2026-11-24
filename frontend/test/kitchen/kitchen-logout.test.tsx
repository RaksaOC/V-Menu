import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw";

// VM-19: a chef can sign out on a shared kitchen tablet, from the board and from the history.
const firebaseSignOut = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("firebase/auth", () => ({ signOut: firebaseSignOut }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));

import KitchenBoard from "@/features/kitchen/components/KitchenBoard";
import KitchenHistory from "@/features/kitchen/components/KitchenHistory";
import { navigation } from "@/lib/session";

describe("signing out of the kitchen (VM-19)", () => {
    beforeEach(() => {
        firebaseSignOut.mockClear();
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen", () => HttpResponse.json([])),
            http.get("*/api/orders/demo-bistro/kitchen/history", () =>
                HttpResponse.json({ orders: [], page: 1, limit: 20, total: 0, pages: 1 }),
            ),
            http.post("*/api/auth/logout", () => HttpResponse.json({ message: "Signed out" })),
        );
    });

    it.each([
        ["board", () => <KitchenBoard pollMs={60_000} />],
        ["history", () => <KitchenHistory />],
    ] as const)("the %s has a Sign Out button that ends the session and opens the kitchen login", async (_name, page) => {
        const go = vi.spyOn(navigation, "to").mockImplementation(() => {});
        render(page());
        await userEvent.setup().click(screen.getByRole("button", { name: "Sign Out" }));
        await waitFor(() => expect(go).toHaveBeenCalledWith("/demo-bistro/kitchen/login"));
        expect(firebaseSignOut).toHaveBeenCalled();
    });
});
