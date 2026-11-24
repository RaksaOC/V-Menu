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

export async function signInAs(context: BrowserContext, baseURL: string, role: "owner" | "cashier" | "chef") {
    const user = { uid: "demo-owner", email: "owner@demo.local", role, ...(role === "owner" ? {} : { resId: RES_ID, resSlug: SLUG }) };
    const token = await new SignJWT(user)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("v-menu")
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(new TextEncoder().encode(jwtSecret()));
    await context.addCookies([{ name: "token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
}
