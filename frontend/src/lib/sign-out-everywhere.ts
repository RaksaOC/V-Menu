import api from "@/lib/api";
import { signOut } from "@/lib/session";

/**
 * SEC-03: ends every session of this account, on every device, then signs out here.
 * Returns false if the server couldn't do it; nothing changes here in that case.
 */
export async function signOutEverywhere(): Promise<boolean> {
    try {
        await api.post("/api/auth/sign-out-everywhere");
    } catch {
        return false;
    }
    await signOut();
    return true;
}
