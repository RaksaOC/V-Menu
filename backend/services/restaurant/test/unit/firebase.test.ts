import { describe, expect, it, vi } from "vitest";
import { firebaseVerifier } from "../../src/clients/firebase.js";

// B6: e2e tests sign in for real, against the Firebase Auth emulator. Its ID tokens are unsigned,
// so restaurant-service may only accept them when E2E=1, the emulator host is set and the
// project is a "demo-" project (which can never be a real one); the emulator confirms each token.

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const unsigned = (claims: object) => `${b64({ alg: "none", typ: "JWT" })}.${b64(claims)}.`;
const PROJECT = "demo-vmenu";
const claims = (extra = {}) => ({
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: "uid-1",
    email: "Owner@E2E.test",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
});
const EMULATOR = { E2E: "1", FIREBASE_AUTH_EMULATOR_HOST: "auth-emulator:9099", FIREBASE_PROJECT_ID: PROJECT };
const lookup = (users: object[] | null, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(users ? { users } : { error: { message: "INVALID_ID_TOKEN" } }), { status }));

describe("Firebase ID tokens (B6)", () => {
    it("never trusts the emulator without E2E=1, even when its host is set", async () => {
        const fetchFn = lookup([{ localId: "uid-1" }]);
        const verify = firebaseVerifier({ FIREBASE_AUTH_EMULATOR_HOST: "auth-emulator:9099", FIREBASE_PROJECT_ID: PROJECT }, fetchFn);
        await expect(verify(unsigned(claims()))).rejects.toThrow();
        expect(fetchFn).not.toHaveBeenCalled();
    });

    it("refuses to start in emulator mode with a real project, or without the emulator's host", () => {
        expect(() => firebaseVerifier({ ...EMULATOR, FIREBASE_PROJECT_ID: "v-menu-prod" })).toThrow(/demo-/);
        expect(() => firebaseVerifier({ E2E: "1", FIREBASE_PROJECT_ID: PROJECT })).toThrow(/FIREBASE_AUTH_EMULATOR_HOST/);
    });

    it("accepts an emulator token once the emulator confirms it", async () => {
        const fetchFn = lookup([{ localId: "uid-1", email: "owner@e2e.test" }]);
        const token = unsigned(claims());
        expect(await firebaseVerifier(EMULATOR, fetchFn)(token)).toEqual({ uid: "uid-1", email: "owner@e2e.test" });
        const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe("http://auth-emulator:9099/identitytoolkit.googleapis.com/v1/accounts:lookup?key=emulator");
        expect(JSON.parse(String(init.body))).toEqual({ idToken: token });
    });

    it("rejects tokens for another project, expired ones, ones without an email, and ones the emulator doesn't know", async () => {
        const ok = lookup([{ localId: "uid-1" }]);
        const verify = firebaseVerifier(EMULATOR, ok);
        await expect(verify(unsigned(claims({ aud: "demo-other" })))).rejects.toThrow();
        await expect(verify(unsigned(claims({ iss: "https://securetoken.google.com/demo-other" })))).rejects.toThrow();
        await expect(verify(unsigned(claims({ exp: Math.floor(Date.now() / 1000) - 10 })))).rejects.toThrow();
        await expect(verify(unsigned(claims({ email: undefined })))).rejects.toThrow();
        await expect(verify("not-a-token")).rejects.toThrow();
        expect(ok).not.toHaveBeenCalled(); // all refused before asking the emulator
        await expect(firebaseVerifier(EMULATOR, lookup(null, 400))(unsigned(claims()))).rejects.toThrow();
        await expect(firebaseVerifier(EMULATOR, lookup([{ localId: "someone-else" }]))(unsigned(claims()))).rejects.toThrow();
    });
});
