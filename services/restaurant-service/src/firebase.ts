import { createRemoteJWKSet, jwtVerify } from "jose";

export interface FirebaseIdentity {
    uid: string;
    email: string;
}
export type VerifyIdToken = (idToken: string) => Promise<FirebaseIdentity>;

// Firebase ID tokens are JWTs signed by Google. Checking them against Google's public keys
// proves who signed in, using only the project id (no service-account secret needed).
// Before this, the old API trusted whatever uid the browser sent.
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export const verifyFirebaseIdToken: VerifyIdToken = async (idToken) => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        algorithms: ["RS256"],
    });
    if (!payload.sub || typeof payload.email !== "string") throw new Error("Token has no user or email");
    return { uid: payload.sub, email: payload.email.toLowerCase() };
};
