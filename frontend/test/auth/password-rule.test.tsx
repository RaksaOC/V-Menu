import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// SEC-08: new passwords need at least 8 characters, with a letter and a number, the same as the
// Firebase password policy. Sign-in doesn't apply it, so older accounts can still sign in.
const firebase = vi.hoisted(() => ({
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
    reload: vi.fn(),
}));
vi.mock("firebase/auth", () => firebase);
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("@/features/auth/api", () => ({ signup: vi.fn(), getMemberships: vi.fn(async () => ({ "A - a": ["owner"] })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { passwordProblem, PASSWORD_RULE } from "@/features/auth/password-rule";
import { Login } from "@/features/auth/components/Login";
import SignupPage from "@/features/auth/components/SignupPage";

const user = { email: "dara@x.test", emailVerified: true, getIdToken: async () => "id-token" };
beforeEach(() => {
    for (const fn of Object.values(firebase)) fn.mockReset();
    firebase.createUserWithEmailAndPassword.mockResolvedValue({ user });
    firebase.signInWithEmailAndPassword.mockResolvedValue({ user });
});

describe("the password rule (SEC-08)", () => {
    it.each([
        ["abc1234", false], // 7 characters
        ["abcdefgh", false], // no number
        ["12345678", false], // no letter
        ["abcdefg1", true],
        ["Ünïcode9", true],
    ])("%s is %s", (password, ok) => {
        expect(passwordProblem(password)).toBe(ok ? undefined : PASSWORD_RULE);
    });

    it("says what it needs", () => {
        expect(PASSWORD_RULE).toBe("Use at least 8 characters, with a letter and a number");
    });
});

describe("forms that set a password (SEC-08)", () => {
    it("creating a staff account at /login refuses a 7-character password before asking Firebase", async () => {
        render(<Login onSuccess={() => {}} />);
        const ui = userEvent.setup();
        await ui.click(screen.getByRole("button", { name: /create an account/i }));
        await ui.type(screen.getByLabelText("Email Address"), "dara@x.test");
        await ui.type(screen.getByLabelText("Password"), "abc1234");
        await ui.click(screen.getByRole("button", { name: "Create account" }));
        expect(await screen.findByText(PASSWORD_RULE)).toBeTruthy();
        expect(firebase.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it("the owner sign-up refuses it too", async () => {
        render(<SignupPage />);
        const ui = userEvent.setup();
        const [restaurant, owner] = screen.getAllByRole("textbox");
        await ui.type(restaurant, "Bistro");
        await ui.type(owner, "Ory");
        await ui.type(document.querySelector("input[type=email]")!, "ory@x.test");
        await ui.type(document.querySelector("input[type=password]")!, "abc1234");
        await ui.click(screen.getByRole("button", { name: /sign up/i }));
        expect(await screen.findByText(PASSWORD_RULE)).toBeTruthy();
        expect(firebase.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it("signing in with an older, shorter password still works", async () => {
        const onSuccess = vi.fn();
        render(<Login onSuccess={onSuccess} />);
        const ui = userEvent.setup();
        await ui.type(screen.getByLabelText("Email Address"), "dara@x.test");
        await ui.type(screen.getByLabelText("Password"), "old123");
        await ui.click(screen.getByRole("button", { name: "Login" }));
        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(firebase.signInWithEmailAndPassword).toHaveBeenCalledWith({}, "dara@x.test", "old123");
    });
});
