// npm run docker:order: places one customer order the way the browser does, through the
// frontend's /api rewrites, and prints the result. Run the seed first.
//   BASE_URL=http://localhost:3400 SLUG=demo-bistro TABLE=T1 npm run docker:order
const base = process.env.BASE_URL ?? "http://localhost:3400";
const slug = process.env.SLUG ?? "demo-bistro";
const table = process.env.TABLE ?? "T1";

async function call(method, path, body) {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: body ? { "content-type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
    return data;
}

// VM-25: grouped by category ({ categories: [{ items }] }); older services answered a flat list
const menu = await call("GET", `/api/menu/${slug}/public/items`);
// VM-26: sold-out dishes are on the menu, but can't be ordered
const items = (Array.isArray(menu) ? menu : (menu?.categories ?? []).flatMap((c) => c.items)).filter((i) => i.isEnabled !== false);
if (!items.length) throw new Error(`No dishes for "${slug}": run npm run docker:seed first`);
await call("GET", `/api/menu/${slug}/public/tables/${table}`);

const cart = items.slice(0, 2).map((item, i) => ({ item: { _id: item._id }, quantity: i + 1 }));
const order = await call("POST", `/api/orders/${slug}`, { table, orderedItems: cart });
const total = order.orderedItems.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
console.log(`order ${order._id} placed at table ${table}:`);
for (const l of order.orderedItems) console.log(`  ${l.quantity} x ${l.item.name} @ ${l.item.price}`);
console.log(`  total ${total.toFixed(2)}`);
