import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from "jose";

export interface FirebaseIdentity {
    uid: string;
    email: string;
    /** VM-13: Firebase checked that this person reads that inbox. Email/password accounts start unverified. */
    emailVerified: boolean;
}
export type VerifyIdToken = (idToken: string) => Promise<FirebaseIdentity>;
type Env = Record<string, string | undefined>;

// Firebase ID tokens are JWTs signed by Google. Checking them against Google's public keys
// proves who signed in, using only the project id (no service-account secret needed).
// Before this, the old API trusted whatever uid the browser sent.
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

function identityFrom(payload: JWTPayload): FirebaseIdentity {
    if (!payload.sub || typeof payload.email !== "string") throw new Error("Token has no user or email");
    return { uid: payload.sub, email: payload.email.toLowerCase(), emailVerified: payload.email_verified === true };
}

export const verifyFirebaseIdToken: VerifyIdToken = async (idToken) => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        algorithms: ["RS256"],
    });
    return identityFrom(payload);
};

/**
 * B6: true when sign-ins go to the Firebase Auth emulator (e2e tests in CI). Needs all three of
 * E2E=1, FIREBASE_AUTH_EMULATOR_HOST and a "demo-" project, which Firebase guarantees is never a
 * real one; E2E=1 with anything missing stops the service rather than quietly using real Firebase.
 */
export function usesAuthEmulator(env: Env = process.env): boolean {
    if (env.E2E !== "1") return false;
    if (!env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error("E2E=1 needs FIREBASE_AUTH_EMULATOR_HOST (the Auth emulator's host:port)");
    if (!env.FIREBASE_PROJECT_ID?.startsWith("demo-"))
        throw new Error("E2E=1 only works with a demo- Firebase project (FIREBASE_PROJECT_ID=demo-...), never a real one");
    return true;
}

/**
 * Emulator tokens aren't signed, so the checks are: the claims (project, expiry, email), then the
 * emulator itself confirms the token belongs to that user (accounts:lookup).
 */
function emulatorVerifier(env: Env, fetchFn: typeof fetch): VerifyIdToken {
    const projectId = env.FIREBASE_PROJECT_ID!;
    const lookup = `http://${env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=emulator`;
    return async (idToken) => {
        const payload = decodeJwt(idToken);
        if (payload.iss !== `https://securetoken.google.com/${projectId}` || payload.aud !== projectId) throw new Error("Wrong project");
        if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error("Token expired");
        const who = identityFrom(payload);
        const res = await fetchFn(lookup, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ idToken }),
        });
        const body = (await res.json().catch(() => ({}))) as { users?: { localId: string }[] };
        if (!res.ok || body.users?.[0]?.localId !== who.uid) throw new Error("The Auth emulator doesn't know this token");
        return who;
    };
}

/** The token check to use: Google's, or the Auth emulator's in e2e runs (B6). */
export function firebaseVerifier(env: Env = process.env, fetchFn: typeof fetch = fetch): VerifyIdToken {
    return usesAuthEmulator(env) ? emulatorVerifier(env, fetchFn) : verifyFirebaseIdToken;
}
