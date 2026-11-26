import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";
import { SignJWT } from "jose";

// Staff screens need an app token. Like the services, the test signs one with JWT_SECRET: from the
// environment, or from backend/services/restaurant/.env (CI writes it with a dummy secret). So these
// tests only run against a stack you started yourself, never against staging or production.
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const SLUG = process.env.SLUG ?? "demo-bistro";
const RES_ID = process.env.RES_ID ?? "64b000000000000000000001"; // the seeded demo restaurant

function jwtSecret(): string {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    const env = readFileSync(join(root, "backend/services/restaurant/.env"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith("JWT_SECRET="));
    if (!line) throw new Error("JWT_SECRET not set and not in backend/services/restaurant/.env");
    return line.slice("JWT_SECRET=".length).trim();
}

/** An app token for `role`. B7: against staging, the post-deploy job passes ready-made, short-lived
 *  CHEF_TOKEN and CASHIER_TOKEN, so the tests never need the secret there. */
export async function staffToken(role: "owner" | "cashier" | "chef"): Promise<string> {
    const given = process.env[`${role.toUpperCase()}_TOKEN`];
    if (given) return given;
    const user = { uid: "demo-owner", email: "owner@demo.local", role, ...(role === "owner" ? {} : { resId: RES_ID, resSlug: SLUG }) };
    return new SignJWT(user)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("v-menu")
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(new TextEncoder().encode(jwtSecret()));
}

/** SEC-12: each role's session cookie; browsers take the "__Host-" name only on https (Secure). */
export const sessionCookie = (role: "owner" | "cashier" | "chef", baseURL: string) =>
    `${new URL(baseURL).protocol === "https:" ? "__Host-" : ""}vmenu_${role}`;

/** A cookie header for API calls made outside a browser (the server reads either name). */
export const sessionHeader = async (role: "owner" | "cashier" | "chef") => `__Host-vmenu_${role}=${await staffToken(role)}`;

export async function signInAs(context: BrowserContext, baseURL: string, role: "owner" | "cashier" | "chef") {
    const token = await staffToken(role);
    const secure = new URL(baseURL).protocol === "https:";
    await context.addCookies([{ name: sessionCookie(role, baseURL), value: token, url: baseURL, httpOnly: true, secure, sameSite: "Lax" }]);
}
