/** The code on a Firebase error, like "auth/invalid-credential". */
export const firebaseCode = (err: unknown) => (err as { code?: string } | null)?.code ?? "";

/** What to tell someone whose Firebase sign-in failed. Never says whether the email has an account. */
export function signInMessage(err: unknown): string {
    switch (firebaseCode(err)) {
        case "auth/network-request-failed":
            return "Can't reach V-Menu right now. Check your internet connection and try again.";
        case "auth/too-many-requests":
            return "Too many attempts. Wait a minute, or reset your password.";
        default:
            return "Incorrect email or password";
    }
}
