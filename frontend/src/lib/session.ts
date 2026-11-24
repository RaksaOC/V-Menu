// VM-03: what happens when a staff member's sign-in ends (the API answers 401).

/** Wrapped so tests can watch navigation; jsdom can't change pages. */
export const navigation = { to: (url: string) => window.location.assign(url) };

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
        const res = await fetch("/api/auth/logout", { method: "POST" });
        if (!res.ok) return false;
    } catch {
        return false;
    }
    await forgetSignIn();
    return true;
}
