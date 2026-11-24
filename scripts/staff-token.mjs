#!/usr/bin/env node
// B7: signs a short-lived chef or cashier token for the demo restaurant, in the shape
// restaurant-service issues (backend/packages/common/src/auth.ts). The post-deploy job runs this
// in its own step and hands only the token to the browser tests, so Playwright and its packages
// never see JWT_SECRET. The token lives 10 minutes and is tied to one restaurant.
//
//   JWT_SECRET=... node scripts/staff-token.mjs <chef|cashier>     prints the token, nothing else
//   SLUG (default demo-bistro) and RES_ID (default the seeded demo restaurant) pick the restaurant.
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";

const TTL_SECONDS = 600;

export function signStaffToken(role, { secret, slug = "demo-bistro", resId = "64b000000000000000000001", now = Date.now() } = {}) {
    if (role !== "chef" && role !== "cashier") throw new Error(`role must be chef or cashier, not ${role}`);
    if (!secret) throw new Error("JWT_SECRET must be set (the same value the services use)");
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const iat = Math.floor(now / 1000);
    const head = b64({ alg: "HS256" });
    const payload = b64({
        uid: `post-deploy-${role}`,
        email: `${role}@post-deploy.local`,
        role,
        resId,
        resSlug: slug,
        iss: "v-menu",
        iat,
        exp: iat + TTL_SECONDS,
    });
    const sig = createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url");
    return `${head}.${payload}.${sig}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        const { JWT_SECRET: secret, SLUG: slug, RES_ID: resId } = process.env;
        process.stdout.write(`${signStaffToken(process.argv[2], { secret, slug, resId })}\n`);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
