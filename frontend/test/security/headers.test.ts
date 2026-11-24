import { describe, expect, it } from "vitest";

// SEC-02: every web page gets the security headers (next.config.ts -> security-headers.ts).
const mod = await import("../../security-headers").catch(() => ({}) as Record<string, never>);
const { securityHeaders, contentSecurityPolicy } = mod as typeof import("../../security-headers");

const asMap = (h: { key: string; value: string }[]) => Object.fromEntries(h.map(({ key, value }) => [key.toLowerCase(), value]));
const directives = (csp: string) =>
    Object.fromEntries(
        csp
            .split(";")
            .map((d) => d.trim().split(/\s+/))
            .filter((d) => d[0])
            .map(([name, ...v]) => [name, v]),
    );

describe("security headers", () => {
    it("sets HSTS, nosniff, referrer, permissions and frame headers", () => {
        const h = asMap(securityHeaders({ dev: false, analytics: false, mode: "enforce" }));
        expect(h["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
        expect(h["x-content-type-options"]).toBe("nosniff");
        expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
        expect(h["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
        expect(h["x-frame-options"]).toBe("DENY");
        expect(h["content-security-policy"]).toBeDefined();
    });

    it("starts in report-only mode, and enforces when asked", () => {
        const reportOnly = asMap(securityHeaders({ dev: false, analytics: false, mode: "report-only" }));
        expect(reportOnly["content-security-policy-report-only"]).toBeDefined();
        expect(reportOnly["content-security-policy"]).toBeUndefined();
        const enforce = asMap(securityHeaders({ dev: false, analytics: false, mode: "enforce" }));
        expect(enforce["content-security-policy-report-only"]).toBeUndefined();
    });
});

describe("content security policy", () => {
    const prod = directives(contentSecurityPolicy({ dev: false, analytics: false }));

    it("allows only this site by default, and can't be framed", () => {
        expect(prod["default-src"]).toEqual(["'self'"]);
        expect(prod["frame-ancestors"]).toEqual(["'none'"]);
        expect(prod["object-src"]).toEqual(["'none'"]);
        expect(prod["base-uri"]).toEqual(["'self'"]);
        expect(prod["form-action"]).toEqual(["'self'"]);
    });

    it("lets Firebase Auth work", () => {
        expect(prod["connect-src"]).toEqual(expect.arrayContaining(["'self'", "https://*.googleapis.com"]));
        expect(prod["frame-src"]).toEqual(expect.arrayContaining(["https://*.firebaseapp.com"]));
    });

    it("images: this site (uploaded photos, VM-02), data and blob URLs (QR codes, previews) and the demo photos", () => {
        expect(prod["img-src"]).toEqual(expect.arrayContaining(["'self'", "data:", "blob:", "https://images.unsplash.com"]));
        expect(prod["img-src"]).not.toContain("https:");
        expect(prod["img-src"]).not.toContain("*");
    });

    it("no eval in production; the dev server gets eval and its websocket", () => {
        expect(prod["script-src"]).not.toContain("'unsafe-eval'");
        const dev = directives(contentSecurityPolicy({ dev: true, analytics: false }));
        expect(dev["script-src"]).toContain("'unsafe-eval'");
        expect(dev["connect-src"]).toEqual(expect.arrayContaining(["ws:"]));
    });

    it("Google Analytics only when analytics is on (production)", () => {
        const all = Object.values(prod).flat().join(" ");
        expect(all).not.toMatch(/googletagmanager|google-analytics/);
        const withGa = directives(contentSecurityPolicy({ dev: false, analytics: true }));
        expect(withGa["script-src"]).toContain("https://www.googletagmanager.com");
        expect(withGa["connect-src"]).toEqual(expect.arrayContaining(["https://*.google-analytics.com"]));
    });
});

describe("object storage in the policy (PHOTOS-S3)", () => {
    it("the browser may post photos to storage and load them from it: only its origin, from config", () => {
        const csp = directives(contentSecurityPolicy({ dev: false, analytics: false, storage: "https://files.example.com/some/path" }));
        expect(csp["connect-src"]).toContain("https://files.example.com");
        expect(csp["img-src"]).toContain("https://files.example.com");
        expect(csp["connect-src"]).not.toContain("https://files.example.com/some/path");
        expect(csp["form-action"]).toEqual(["'self'"]); // the upload is a fetch, not a form submit
    });

    it("leaves storage out when it isn't configured, and ignores a value that isn't an http(s) URL", () => {
        const all = (storage?: string | null) =>
            Object.values(directives(contentSecurityPolicy({ dev: false, analytics: false, storage }))).flat();
        expect(all(undefined)).toEqual(all(null));
        expect(all("")).toEqual(all(null));
        expect(all("javascript:alert(1)")).toEqual(all(null));
        expect(all("not a url")).toEqual(all(null));
    });

    it("next.config reads the storage address from S3_PUBLIC_URL", async () => {
        const before = process.env.S3_PUBLIC_URL;
        process.env.S3_PUBLIC_URL = "http://127.0.0.1:9400";
        try {
            const { default: config } = await import("../../next.config");
            const rules = await config.headers!(); // read when the headers are built
            const csp = Object.values(asMap(rules[0].headers)).find((v) => v.includes("default-src"))!;
            expect(directives(csp)["connect-src"]).toContain("http://127.0.0.1:9400");
            expect(directives(csp)["img-src"]).toContain("http://127.0.0.1:9400");
        } finally {
            if (before === undefined) delete process.env.S3_PUBLIC_URL;
            else process.env.S3_PUBLIC_URL = before;
        }
    });
});

describe("next.config", () => {
    it("adds the headers to every page, but leaves /api to the services (Helmet)", async () => {
        const { default: config } = await import("../../next.config");
        const rules = await config.headers!();
        expect(rules).toHaveLength(1);
        expect(rules[0].source).toBe("/((?!api/).*)");
        expect(asMap(rules[0].headers)["x-frame-options"]).toBe("DENY");
    });
});
