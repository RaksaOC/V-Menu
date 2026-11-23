// B6: the Firebase Auth emulator, through its REST API. Makes test users and reads the emails
// (verification, password reset) the app "sends", which the emulator keeps instead of sending.
// Docs: https://firebase.google.com/docs/emulator-suite/connect_auth#rest
export const EMULATOR = process.env.AUTH_EMULATOR_URL ?? "http://127.0.0.1:9099";
export const PROJECT = process.env.FIREBASE_PROJECT_ID ?? "demo-vmenu";

const api = (path: string) => `${EMULATOR}/identitytoolkit.googleapis.com/v1/${path}?key=emulator`;

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${init.method ?? "GET"} ${url}: ${res.status} ${JSON.stringify(body)}`);
    return body as T;
}
const post = <T>(path: string, body: object) => call<T>(api(path), { method: "POST", body: JSON.stringify(body) });

export async function isRunning(): Promise<boolean> {
    try {
        return (await fetch(EMULATOR)).ok;
    } catch {
        return false;
    }
}

/** A fresh, unique email, so tests don't trip over each other's users. */
export const testEmail = (who: string) => `${who}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;

export interface TestUser {
    uid: string;
    email: string;
    password: string;
    idToken: string;
}

export async function createUser(email = testEmail("user"), password = "e2e-password-1"): Promise<TestUser> {
    const r = await post<{ localId: string; idToken: string }>("accounts:signUp", { email, password, returnSecureToken: true });
    return { uid: r.localId, email, password, idToken: r.idToken };
}

export async function signIn(email: string, password: string): Promise<string> {
    return (await post<{ idToken: string }>("accounts:signInWithPassword", { email, password, returnSecureToken: true })).idToken;
}

export async function userExists(email: string): Promise<boolean> {
    try {
        const r = await post<{ registered?: boolean }>("accounts:createAuthUri", { identifier: email, continueUri: "http://localhost" });
        return Boolean(r.registered);
    } catch {
        return false;
    }
}

/** Asks for a password-reset email, as the "Forgot password" link would. */
export const sendPasswordReset = (email: string) => post("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email });

/** Asks for a verification email for a signed-in user. */
export const sendVerification = (idToken: string) => post("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken });

export type EmailKind = "PASSWORD_RESET" | "VERIFY_EMAIL";
export interface Email {
    email: string;
    requestType: EmailKind;
    oobCode: string;
    oobLink: string;
}

/** The newest email of this kind sent to this address, waiting up to `timeoutMs` for it. */
export async function latestEmail(email: string, kind: EmailKind, timeoutMs = 5_000): Promise<Email> {
    const until = Date.now() + timeoutMs;
    for (;;) {
        const { oobCodes } = await call<{ oobCodes: Email[] }>(`${EMULATOR}/emulator/v1/projects/${PROJECT}/oobCodes`);
        const found = oobCodes.filter((c) => c.email === email.toLowerCase() && c.requestType === kind).at(-1);
        if (found) return found;
        if (Date.now() > until) throw new Error(`No ${kind} email for ${email}`);
        await new Promise((r) => setTimeout(r, 200));
    }
}

/** Follows a password-reset email: sets the new password with its code. */
export const resetPassword = (oobCode: string, newPassword: string) => post("accounts:resetPassword", { oobCode, newPassword });

/** Follows a verification email. */
export const verifyEmail = (oobCode: string) => post("accounts:update", { oobCode });

/** Every user and email in the emulator, gone. */
export const clearAll = () => call(`${EMULATOR}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
