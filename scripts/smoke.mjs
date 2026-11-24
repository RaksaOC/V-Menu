// Smoke test against the running Docker stack (CI integration job, or locally after
// `npm run docker:up && npm run docker:seed`):
//   1. every service's /health answers OK (through the frontend's /api/health rewrites);
//   2. a customer places an order at a table, the same calls the browser makes;
//   3. the kitchen queue, read with a chef token, contains that order.
// The chef token is signed here with the stack's JWT_SECRET, since real staff sign-in needs
// Firebase. Exits non-zero on the first failure.
//   JWT_SECRET=... BASE_URL=http://localhost:3400 node scripts/smoke.mjs
import { createHmac } from "node:crypto";

const base = process.env.BASE_URL ?? "http://localhost:3400";
const slug = process.env.SLUG ?? "demo-bistro";
const table = process.env.TABLE ?? "T1";
const resId = process.env.RES_ID ?? "64b000000000000000000001"; // the seeded demo restaurant
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET must be set (the same value the services use)");

async function call(method, path, { body, token } = {}) {
    const headers = {};
    if (body) headers["content-type"] = "application/json";
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
    return data;
}

// HS256 app token in the shape restaurant-service issues (see backend/services/*/src/lib/auth.ts).
function signAppToken(claims) {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const head = b64({ alg: "HS256" });
    const payload = b64({ ...claims, iss: "v-menu", iat: now, exp: now + 300 });
    const sig = createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url");
    return `${head}.${payload}.${sig}`;
}

function step(name) {
    console.log(`✓ ${name}`);
}

// 1. health
for (const svc of ["restaurant", "menu", "order"]) {
    const h = await call("GET", `/api/health/${svc}`);
    if (h?.status && h.status !== "ok") throw new Error(`${svc} health: ${JSON.stringify(h)}`);
    step(`${svc}-service healthy`);
}

// 2. customer order
const items = await call("GET", `/api/menu/${slug}/public/items`);
if (!items.length) throw new Error(`No dishes for "${slug}": seed the stack first`);
await call("GET", `/api/menu/${slug}/public/tables/${table}`);
const cart = items.slice(0, 2).map((item, i) => ({ item: { _id: item._id }, quantity: i + 1 }));
const order = await call("POST", `/api/orders/${slug}`, { body: { table, orderedItems: cart } });
if (!order?._id) throw new Error(`Order response has no _id: ${JSON.stringify(order)}`);
step(`order ${order._id} placed at table ${table} (${order.orderedItems.length} lines)`);

// 3. kitchen queue
const chef = signAppToken({ uid: "smoke-chef", email: "chef@smoke.local", role: "chef", resId, resSlug: slug });
const queue = await call("GET", `/api/orders/${slug}/kitchen`, { token: chef });
const found = queue.find((o) => String(o._id) === String(order._id));
if (!found) throw new Error(`Order ${order._id} is not in the kitchen queue (${queue.length} orders)`);
if (found.isDone) throw new Error(`Order ${order._id} is already marked done`);
step(`kitchen queue shows order ${order._id}`);

console.log("smoke test passed");
