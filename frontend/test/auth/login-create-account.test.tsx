import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// VM-12: an invited cashier or chef creates their account at /login; VM-13: their invite counts
// once the email is verified, so they verify first, then carry on with a fresh token.
const firebase = vi.hoisted(() => ({
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
    reload: vi.fn(),
}));
const api = vi.hoisted(() => ({ getMemberships: vi.fn() }));
vi.mock("firebase/auth", () => firebase);
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("@/features/auth/api", () => api);

import { Login } from "@/features/auth/components/Login";

const user = { email: "dara@x.test", emailVerified: false, getIdToken: vi.fn() };
const ROLES = { "Demo Bistro - demo-bistro": ["cashier"] };

async function fill(ui: ReturnType<typeof userEvent.setup>, button: string) {
    await ui.type(screen.getByLabelText("Email Address"), user.email);
    await ui.type(screen.getByLabelText("Password"), "secret-123");
    await ui.click(screen.getByRole("button", { name: button }));
}

describe("creating a staff account at /login (VM-12, VM-13)", () => {
    beforeEach(() => {
        user.emailVerified = false;
        user.getIdToken.mockReset().mockImplementation(async (fresh?: boolean) => (fresh ? "fresh-token" : "old-token"));
        firebase.createUserWithEmailAndPassword.mockReset().mockResolvedValue({ user });
        firebase.signInWithEmailAndPassword.mockReset().mockResolvedValue({ user });
        firebase.sendEmailVerification.mockReset().mockResolvedValue(undefined);
        firebase.reload.mockReset().mockResolvedValue(undefined);
        api.getMemberships.mockReset().mockResolvedValue({});
    });

    it("creates the account, sends the verification email, and waits for it", async () => {
        const onSuccess = vi.fn();
        render(<Login onSuccess={onSuccess} />);
        const ui = userEvent.setup();
        await ui.click(screen.getByRole("button", { name: /create an account/i }));
        await fill(ui, "Create account");
        expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeTruthy();
        expect(firebase.createUserWithEmailAndPassword).toHaveBeenCalledWith({}, user.email, "secret-123");
        expect(firebase.sendEmailVerification).toHaveBeenCalledWith(user);
        expect(onSuccess).not.toHaveBeenCalled();

        // verified: a fresh token (it now says the email is verified), then their restaurants
        firebase.reload.mockImplementation(async () => {
            user.emailVerified = true;
        });
        api.getMemberships.mockResolvedValue(ROLES);
        await ui.click(screen.getByRole("button", { name: "I've verified my email" }));
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ email: user.email, idToken: "fresh-token" }, ROLES));
        expect(api.getMemberships).toHaveBeenCalledWith("fresh-token");
    });

    it("signing in unverified with no roles yet asks to verify, instead of an empty list", async () => {
        const onSuccess = vi.fn();
        render(<Login onSuccess={onSuccess} />);
        await fill(userEvent.setup(), "Login");
        expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeTruthy();
        expect(firebase.sendEmailVerification).toHaveBeenCalledWith(user);
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it("a verified sign-in, or one that already has roles, goes straight on", async () => {
        const onSuccess = vi.fn();
        api.getMemberships.mockResolvedValue(ROLES);
        render(<Login onSuccess={onSuccess} />);
        await fill(userEvent.setup(), "Login");
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ email: user.email, idToken: "old-token" }, ROLES));
        expect(firebase.sendEmailVerification).not.toHaveBeenCalled();
    });
});
