import { request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { SLUG, staffToken } from "./auth";

// CL-14: a table of the spec's own, so specs running side by side never share a table's bill.
// The demo restaurant has four tables and several specs order at them; a spec that watches a
// table's bill (like the cashier's live bills) gets one nobody else uses, and removes it after.

export interface OwnTable {
    name: string;
    _id: string;
    /** Settles the table's bill and deletes the table. */
    remove: () => Promise<void>;
}

async function as(role: "owner" | "cashier", baseURL: string): Promise<APIRequestContext> {
    return playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { cookie: `token=${await staffToken(role)}` } });
}

export async function ownTable(baseURL: string, prefix = "E2E"): Promise<OwnTable> {
    const owner = await as("owner", baseURL);
    const cashier = await as("cashier", baseURL);
    const name = `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`.slice(0, 20);
    const res = await owner.post(`/api/menu/${SLUG}/tables`, { data: { type: "manual", name } });
    if (!res.ok()) throw new Error(`could not make table ${name}: ${res.status()} ${await res.text()}`);
    const table = (await res.json()) as { _id: string; name: string };
    // new tables start closed (VM-04); the cashier opens it, as at a real table
    await cashier.patch(`/api/menu/${SLUG}/tables/${table._id}/availability`, { data: { isEnabled: true } });
    return {
        name: table.name,
        _id: table._id,
        remove: async () => {
            const open = (await (await cashier.get(`/api/orders/${SLUG}/bills?status=open`)).json()) as { _id: string; table: string }[];
            for (const b of open.filter((b) => b.table === table.name))
                await cashier.patch(`/api/orders/${SLUG}/bills/${b._id}`, { data: { isPaid: true } });
            await owner.delete(`/api/menu/${SLUG}/tables/${table._id}`);
            await owner.dispose();
            await cashier.dispose();
        },
    };
}
