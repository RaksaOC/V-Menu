import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Clears every copy of the session: the httpOnly cookie (only the server can remove it),
// the token the API client sends, and the Firebase sign-in.
export async function signOut() {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
    } catch {
        // offline: the cookie expires on its own within the hour
    }
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    await firebaseSignOut(auth).catch(() => {});
}
