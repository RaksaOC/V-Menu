#!/usr/bin/env node
// B7: signs a short-lived chef or cashier token for the demo restaurant, in the shape
// restaurant-service issues (backend/packages/common/src/auth.ts). The post-deploy job runs this
// in its own step and hands only the token to the browser tests, so Playwright and its packages
// never see JWT_SECRET. The token lives 10 minutes and is tied to one restaurant.
//
// SEC-03: a token counts only for someone who has that role there. The seed gives its demo owner
// all three roles at demo-bistro, so the token is the demo owner's (the same user smoke.mjs and
// the e2e tests use), with session version 0, as the seeded rows have.
//
//   JWT_SECRET=... node infra/checks/staff-token.mjs <chef|cashier>     prints the token, nothing else
//   SLUG (default demo-bistro) and RES_ID (default the seeded demo restaurant) pick the restaurant;
//   SEED_OWNER_UID and SEED_OWNER_EMAIL, if the seed was run with them, pick its owner.
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";

const TTL_SECONDS = 600;

export function signStaffToken(
    role,
    {
        secret,
        slug = "demo-bistro",
        resId = "64b000000000000000000001",
        uid = "demo-owner",
        email = "owner@demo.local",
        now = Date.now(),
    } = {},
) {
    if (role !== "chef" && role !== "cashier") throw new Error(`role must be chef or cashier, not ${role}`);
    if (!secret) throw new Error("JWT_SECRET must be set (the same value the services use)");
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const iat = Math.floor(now / 1000);
    const head = b64({ alg: "HS256" });
    const payload = b64({
        uid,
        email,
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
        const { JWT_SECRET: secret, SLUG: slug, RES_ID: resId, SEED_OWNER_UID: uid, SEED_OWNER_EMAIL: email } = process.env;
        process.stdout.write(
            `${signStaffToken(process.argv[2], { secret, slug, resId, uid: uid || undefined, email: email || undefined })}\n`,
        );
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
