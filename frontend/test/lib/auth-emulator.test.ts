import { describe, expect, it } from "vitest";
import { authEmulatorUrl } from "@/lib/auth-emulator";
import { contentSecurityPolicy } from "../../security-headers";

// B6: the browser talks to the Firebase Auth emulator only in e2e builds of a demo- project.
describe("Auth emulator switch (B6)", () => {
    const e2e = { e2e: "1", url: "http://127.0.0.1:9099", projectId: "demo-vmenu" };

    it("is on for an E2E build of a demo- project", () => {
        expect(authEmulatorUrl(e2e)).toBe("http://127.0.0.1:9099");
    });

    it("is off without the flag, without a URL, or for a real project", () => {
        expect(authEmulatorUrl({ ...e2e, e2e: undefined })).toBeNull();
        expect(authEmulatorUrl({ ...e2e, e2e: "true" })).toBeNull();
        expect(authEmulatorUrl({ ...e2e, url: "" })).toBeNull();
        expect(authEmulatorUrl({ ...e2e, projectId: "v-menu-prod" })).toBeNull();
    });

    it("lets the page reach the emulator under the CSP, only when it's on", () => {
        const connect = (csp: string) => csp.split("; ").find((d) => d.startsWith("connect-src"))!;
        expect(connect(contentSecurityPolicy({ dev: false, analytics: false, authEmulator: "http://127.0.0.1:9099" }))).toContain(
            "http://127.0.0.1:9099",
        );
        expect(connect(contentSecurityPolicy({ dev: false, analytics: false }))).not.toContain("9099");
    });
});
