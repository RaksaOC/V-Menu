import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// The shared client imports the Firebase config only for `auth`; no Firebase app is needed here.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
const { default: api } = await import("@/lib/api");

// Captures the Authorization header the API receives.
function captureAuth() {
    const seen: (string | null)[] = [];
    server.use(
        http.get("*/api/ping", ({ request }) => {
            seen.push(request.headers.get("authorization"));
            return HttpResponse.json({ ok: true });
        }),
    );
    return seen;
}

describe("shared API client", () => {
    it("never sends a token from page storage; the browser sends the httpOnly cookie (SEC-01)", async () => {
        const seen = captureAuth();
        localStorage.setItem("token", "abc.def.ghi");
        await api.get("/api/ping");
        expect(seen).toEqual([null]);
    });

    it("sends no Authorization header when nobody is signed in", async () => {
        const seen = captureAuth();
        await api.get("/api/ping");
        expect(seen).toEqual([null]);
    });

    it("calls the site's own origin", async () => {
        const seen = captureAuth();
        const res = await api.get("/api/ping");
        expect(res.data).toEqual({ ok: true });
        expect(seen).toHaveLength(1);
    });
});
