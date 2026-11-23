import api from "@/lib/api";

export type StaffRole = "owner" | "cashier" | "chef";

export interface LoginRequest {
    idToken: string;
    role: StaffRole;
    /** Required for cashier and chef; owners sign in without a restaurant. */
    resSlug?: string;
}

/** Exchanges a Firebase ID token for a session. The server sets it as an httpOnly cookie;
 *  nothing comes back for the page to keep (SEC-01). */
export async function login(request: LoginRequest): Promise<void> {
    await api.post("/api/auth/login", request);
}

/** The restaurants the user can sign in to, per role ("Name - slug" strings). */
export async function getMemberships(idToken: string): Promise<Record<string, string[]>> {
    const { data } = await api.post<Record<string, string[]>>("/api/auth/memberships", { idToken });
    return data;
}

export async function signup(request: { idToken: string; ownerName: string; resName: string }): Promise<void> {
    await api.post("/api/auth/signup", request);
}
