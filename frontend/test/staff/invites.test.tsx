import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw";

// VM-12: the owner invites staff by name, email and role. No password, and no Firebase account
// made in the owner's browser (which used to sign the owner's browser in as the new person).
const firebase = vi.hoisted(() => ({ createUserWithEmailAndPassword: vi.fn(), fetchSignInMethodsForEmail: vi.fn(async () => []) }));
vi.mock("firebase/auth", () => firebase);
vi.mock("@/lib/firebase", () => ({ auth: {} }));

import StaffForm from "@/features/staff/components/StaffForm";
import Staff from "@/features/staff/components/Staff";
import AllStaff from "@/features/staff/components/AllStaff";
import { ResContext } from "@/lib/restaurant-context";

const member = (name: string, tenantId: string | null) => ({
    _id: `id-${name}`,
    name,
    email: `${name.toLowerCase()}@x.test`,
    role: "cashier",
    tenantId,
    resId: "r1",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
});

async function fillInvite(ui: ReturnType<typeof userEvent.setup>) {
    await ui.type(screen.getByLabelText("Name"), "Dara");
    await ui.type(screen.getByLabelText("Email"), "dara@x.test");
    await ui.selectOptions(screen.getByLabelText("Role"), "cashier");
    await ui.click(screen.getByRole("button", { name: "Send invite" }));
}

describe("staff invites (VM-12)", () => {
    it("the form asks for name, email and role only, and says how they get in", async () => {
        const onAdd = vi.fn();
        render(<StaffForm onClose={() => {}} onAdd={onAdd} />);
        expect(screen.queryByLabelText(/password/i)).toBeNull();
        expect(screen.getByText(/create an account or sign in at/i)).toBeTruthy();
        await fillInvite(userEvent.setup());
        expect(onAdd).toHaveBeenCalledWith({ name: "Dara", email: "dara@x.test", role: "cashier" });
    });

    it("adding sends the invite to the API and makes no Firebase account", async () => {
        let sent: unknown = null;
        server.use(
            http.get("*/api/restaurants/demo-bistro/staff", () => HttpResponse.json([])),
            http.post("*/api/restaurants/demo-bistro/staff", async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json(member("Dara", null), { status: 201 });
            }),
        );
        render(
            <ResContext.Provider value="demo-bistro">
                <Staff />
            </ResContext.Provider>,
        );
        const ui = userEvent.setup();
        await ui.click(await screen.findByRole("button", { name: /add staff/i }));
        await fillInvite(ui);
        await waitFor(() => expect(sent).toEqual({ name: "Dara", email: "dara@x.test", role: "cashier" }));
        expect(firebase.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it("someone who hasn't signed in yet shows Invite pending", async () => {
        server.use(
            http.get("*/api/restaurants/demo-bistro/staff", () => HttpResponse.json([member("Dara", null), member("Sok", "uid-sok")])),
        );
        render(
            <ResContext.Provider value="demo-bistro">
                <Staff />
            </ResContext.Provider>,
        );
        await screen.findAllByText("Dara");
        const pending = screen.getAllByText("Invite pending");
        expect(pending.length).toBeGreaterThan(0);
        for (const label of pending) expect(label.closest("tr, [data-member]")?.textContent).toContain("Dara");
    });

    it("someone who already has that role here is a field error, not a silent failure", async () => {
        server.use(
            http.get("*/api/restaurants/demo-bistro/staff", () => HttpResponse.json([])),
            http.post("*/api/restaurants/demo-bistro/staff", () =>
                HttpResponse.json({ message: "This person already has that role here" }, { status: 409 }),
            ),
        );
        render(
            <ResContext.Provider value="demo-bistro">
                <Staff />
            </ResContext.Provider>,
        );
        const ui = userEvent.setup();
        await ui.click(await screen.findByRole("button", { name: /add staff/i }));
        await fillInvite(ui);
        expect(await screen.findByText("This person already has that role here")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Send invite" })).toBeTruthy(); // the form stays open
    });

    it("the all-restaurants staff list shows Invite pending too", async () => {
        server.use(
            http.get("*/api/staff", () =>
                HttpResponse.json([{ resName: "Demo Bistro", staff: [member("Dara", null), member("Sok", "uid-sok")] }]),
            ),
        );
        render(<AllStaff />);
        await screen.findAllByText("Dara");
        const pending = screen.getAllByText("Invite pending");
        expect(pending.length).toBeGreaterThan(0);
        for (const label of pending) expect(label.closest("tr, [data-member]")?.textContent).toContain("Dara");
    });
});
