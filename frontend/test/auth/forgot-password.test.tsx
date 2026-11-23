import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// VM-14: every login page has "Forgot password?", it never says whether an email has an account,
// and the four pages share one form. VM-13: staff who haven't verified are told to.
const firebase = vi.hoisted(() => ({
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    reload: vi.fn(),
}));
const api = vi.hoisted(() => ({ login: vi.fn(), getMemberships: vi.fn() }));
const push = vi.hoisted(() => vi.fn());
vi.mock("firebase/auth", () => firebase);
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("@/features/auth/api", () => api);
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push }) }));

import { Login } from "@/features/auth/components/Login";
import OwnerLogin from "@/features/auth/components/OwnerLogin";
import CashierLogin from "@/features/auth/components/CashierLogin";
import KitchenLogin from "@/features/auth/components/KitchenLogin";

const SENT = "If that email has an account, we sent a link.";
const PAGES = [
    ["/login", () => <Login onSuccess={() => {}} />],
    ["owner", () => <OwnerLogin />],
    ["cashier", () => <CashierLogin />],
    ["kitchen", () => <KitchenLogin />],
] as const;

async function askForReset(ui: ReturnType<typeof userEvent.setup>, email: string) {
    await ui.click(screen.getByRole("button", { name: "Forgot password?" }));
    const field = screen.getByLabelText("Email Address");
    await ui.clear(field);
    if (email) await ui.type(field, email);
    await ui.click(screen.getByRole("button", { name: "Send reset link" }));
}

async function signIn(ui: ReturnType<typeof userEvent.setup>) {
    await ui.type(screen.getByLabelText("Email Address"), "dara@x.test");
    await ui.type(screen.getByLabelText("Password"), "secret-123");
    await ui.click(screen.getByRole("button", { name: "Login" }));
}

beforeEach(() => {
    for (const fn of Object.values(firebase)) fn.mockReset();
    api.login.mockReset().mockResolvedValue(undefined);
    api.getMemberships.mockReset().mockResolvedValue({});
    push.mockReset();
    firebase.sendPasswordResetEmail.mockResolvedValue(undefined);
    firebase.sendEmailVerification.mockResolvedValue(undefined);
});

describe.each(PAGES)("forgot password on the %s page (VM-14)", (_name, page) => {
    it("uses the shared login form", () => {
        const { container } = render(page());
        expect(container.querySelector("[data-login-form]")).not.toBeNull();
    });

    it("sends the reset email and says so without confirming the account", async () => {
        render(page());
        await askForReset(userEvent.setup(), "dara@x.test");
        expect(await screen.findByText(SENT)).toBeTruthy();
        expect(firebase.sendPasswordResetEmail).toHaveBeenCalledWith({}, "dara@x.test");
    });

    it("says exactly the same when the email has no account", async () => {
        firebase.sendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });
        render(page());
        await askForReset(userEvent.setup(), "nobody@x.test");
        expect(await screen.findByText(SENT)).toBeTruthy();
    });
});

describe("the reset form (VM-14)", () => {
    it("starts with the email already typed on the login form", async () => {
        render(<OwnerLogin />);
        const ui = userEvent.setup();
        await ui.type(screen.getByLabelText("Email Address"), "dara@x.test");
        await ui.click(screen.getByRole("button", { name: "Forgot password?" }));
        expect(screen.getByLabelText("Email Address")).toHaveValue("dara@x.test");
    });

    it("asks for a valid email before sending", async () => {
        render(<OwnerLogin />);
        await askForReset(userEvent.setup(), "");
        expect(await screen.findByText("Email is required")).toBeTruthy();
        expect(firebase.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("doesn't claim it sent anything when the network failed", async () => {
        firebase.sendPasswordResetEmail.mockRejectedValue({ code: "auth/network-request-failed" });
        render(<OwnerLogin />);
        await askForReset(userEvent.setup(), "dara@x.test");
        expect(await screen.findByText(/couldn't reach the server/i)).toBeTruthy();
        expect(screen.queryByText(SENT)).toBeNull();
    });

    it("goes back to the login form", async () => {
        render(<OwnerLogin />);
        const ui = userEvent.setup();
        await ui.click(screen.getByRole("button", { name: "Forgot password?" }));
        await ui.click(screen.getByRole("button", { name: "Back to login" }));
        expect(screen.getByRole("button", { name: "Login" })).toBeTruthy();
    });
});

describe("signing in through the shared form", () => {
    const user = (emailVerified: boolean) => ({ email: "dara@x.test", emailVerified, getIdToken: vi.fn(async () => "id-token") });
    const noRole = { isAxiosError: true, response: { status: 401, data: { message: "You do not have this role at this restaurant" } } };

    it.each([
        ["owner", () => <OwnerLogin />, { idToken: "id-token", role: "owner" }, "/owner"],
        [
            "cashier",
            () => <CashierLogin />,
            { idToken: "id-token", role: "cashier", resSlug: "demo-bistro" },
            "/demo-bistro/cashier/dashboard",
        ],
        ["kitchen", () => <KitchenLogin />, { idToken: "id-token", role: "chef", resSlug: "demo-bistro" }, "/demo-bistro/kitchen"],
    ] as const)("the %s page signs in and goes to its screen", async (_name, page, body, next) => {
        firebase.signInWithEmailAndPassword.mockResolvedValue({ user: user(true) });
        render(page());
        await signIn(userEvent.setup());
        await waitFor(() => expect(push).toHaveBeenCalledWith(next));
        expect(api.login).toHaveBeenCalledWith(body);
    });

    it("a staff member whose email isn't verified is told to verify, and gets the email", async () => {
        const u = user(false);
        firebase.signInWithEmailAndPassword.mockResolvedValue({ user: u });
        api.login.mockRejectedValue(noRole);
        render(<CashierLogin />);
        await signIn(userEvent.setup());
        expect(await screen.findByRole("alert")).toHaveTextContent(/verify your email first/i);
        expect(firebase.sendEmailVerification).toHaveBeenCalledWith(u);
        expect(push).not.toHaveBeenCalled();
    });

    it("a verified staff member without the role isn't told to verify", async () => {
        firebase.signInWithEmailAndPassword.mockResolvedValue({ user: user(true) });
        api.login.mockRejectedValue(noRole);
        render(<KitchenLogin />);
        await signIn(userEvent.setup());
        expect(await screen.findByText("You do not have this role at this restaurant")).toBeTruthy();
        expect(firebase.sendEmailVerification).not.toHaveBeenCalled();
    });

    it("a wrong password says so, and never asks for a session", async () => {
        firebase.signInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
        render(<CashierLogin />);
        await signIn(userEvent.setup());
        expect(await screen.findByText("Incorrect email or password")).toBeTruthy();
        expect(api.login).not.toHaveBeenCalled();
    });
});
