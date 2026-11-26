import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// VM-13: after sign-up the owner gets a verification email, and the page says "Check your inbox"
// until the email is verified.
const push = vi.fn();
const user = { email: "ory@x.test", emailVerified: false, getIdToken: async () => "id-token" };
const firebase = vi.hoisted(() => ({
    createUserWithEmailAndPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
    reload: vi.fn(),
}));
vi.mock("firebase/auth", () => firebase);
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("@/features/auth/api", () => ({ signup: vi.fn(async () => ({ slug: "bistro-1" })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import SignupPage from "@/features/auth/components/SignupPage";

async function signUp() {
    render(<SignupPage />);
    const ui = userEvent.setup();
    const [restaurant, owner] = screen.getAllByRole("textbox");
    await ui.type(restaurant, "Bistro");
    await ui.type(owner, "Ory");
    await ui.type(document.querySelector("input[type=email]")!, user.email);
    await ui.type(document.querySelector("input[type=password]")!, "secret-123");
    await ui.click(screen.getByRole("button", { name: /sign up/i }));
    return ui;
}

describe("sign-up asks the owner to verify their email (VM-13)", () => {
    beforeEach(() => {
        push.mockReset();
        user.emailVerified = false;
        firebase.createUserWithEmailAndPassword.mockResolvedValue({ user });
        firebase.sendEmailVerification.mockReset().mockResolvedValue(undefined);
        firebase.reload.mockReset().mockResolvedValue(undefined);
    });

    it("sends the verification email and says to check the inbox, instead of moving on", async () => {
        await signUp();
        expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeTruthy();
        expect(screen.getByText(/ory@x\.test/)).toBeTruthy();
        expect(firebase.sendEmailVerification).toHaveBeenCalledWith(user);
        expect(push).not.toHaveBeenCalled();
    });

    it("stays until the email is verified, then goes on to sign in", async () => {
        const ui = await signUp();
        await screen.findByRole("heading", { name: "Check your inbox" });
        await ui.click(screen.getByRole("button", { name: "I've verified my email" }));
        expect(await screen.findByText(/not verified yet/i)).toBeTruthy();
        expect(push).not.toHaveBeenCalled();

        firebase.reload.mockImplementation(async () => {
            user.emailVerified = true;
        });
        await ui.click(screen.getByRole("button", { name: "I've verified my email" }));
        await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    });

    it("can send the email again", async () => {
        const ui = await signUp();
        await screen.findByRole("heading", { name: "Check your inbox" });
        await ui.click(screen.getByRole("button", { name: "Send it again" }));
        await waitFor(() => expect(firebase.sendEmailVerification).toHaveBeenCalledTimes(2));
        expect(await screen.findByText(/sent again/i)).toBeTruthy();
    });
});
