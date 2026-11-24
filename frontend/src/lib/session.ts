// VM-03: what happens when a staff member's sign-in ends (the API answers 401).

/** Wrapped so tests can watch navigation; jsdom can't change pages. */
export const navigation = { to: (url: string) => window.location.assign(url) };

export type StaffRole = "owner" | "cashier" | "chef";

/** SEC-12: the header that tells the API which of this browser's sign-ins a request is for. */
export const ROLE_HEADER = "x-vmenu-role";

/** The role whose page this is (the kitchen is the chef's), or null on customer and public pages. */
export function roleForPath(path: string): StaffRole | null {
    const staff = /^\/[^/]+\/(kitchen|cashier)(\/|$)/.exec(path);
    if (staff) return staff[1] === "kitchen" ? "chef" : "cashier";
    return /^\/owner(\/|$)/.test(path) ? "owner" : null;
}

/** SEC-12: the role's session cookie; "__Host-" on https, the bare name on plain http (local dev). */
export const sessionCookieNames = (role: StaffRole) => [`__Host-vmenu_${role}`, `vmenu_${role}`];

/** The login page for the role whose page this is, or null on customer and public pages. */
export function loginPathFor(path: string): string | null {
    const staff = /^\/([^/]+)\/(kitchen|cashier)(\/|$)/.exec(path);
    if (staff) return `/${staff[1]}/${staff[2]}/login`;
    if (/^\/owner(\/|$)/.test(path)) return "/owner/login";
    return null;
}

/** Forgets the token and opens the role's login page, which then says the session ended. */
export function endSession(): void {
    const login = loginPathFor(window.location.pathname);
    if (!login || window.location.pathname === login) return; // customers, or already signing in
    localStorage.removeItem("token");
    navigation.to(`${login}?expired=1`);
}

/** The message for a sign-out the server didn't confirm. */
export const SIGN_OUT_FAILED = "Couldn't sign out, so you're still signed in. Please try again.";

/** Clears this browser's own copies of the sign-in: the token the API client sends, and Firebase's. */
export async function forgetSignIn() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    // Loaded only when signing out, so pages that just call the API (customer pages) don't load Firebase.
    const [{ signOut: firebaseSignOut }, { auth }] = await Promise.all([import("firebase/auth"), import("@/lib/firebase")]);
    await firebaseSignOut(auth).catch(() => {});
}

/**
 * Ends the session here. SEC-01: only the server can remove the httpOnly cookie, and the cookie
 * stays a working session for up to 12 hours (VM-03). So this is true only once the server has
 * answered OK; on any other answer, or none (offline), it is false and nothing here changes: the
 * caller says so and keeps the person on the page, instead of showing them as signed out.
 */
export async function signOut(): Promise<boolean> {
    try {
        // SEC-12: signs out of this screen's role only; the owner's other screens stay signed in
        const role = roleForPath(window.location.pathname);
        const res = await fetch("/api/auth/logout", { method: "POST", headers: role ? { [ROLE_HEADER]: role } : {} });
        if (!res.ok) return false;
    } catch {
        return false;
    }
    await forgetSignIn();
    return true;
}
