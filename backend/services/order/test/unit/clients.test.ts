import { createServer } from "node:http";
import type { Request } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { httpClients } from "../../src/clients/index.js";

// CL-05 contract: order-service reads menu-service's answers with the shared schemas, so a
// changed shape fails loudly (502) instead of saving a broken order.
let answer: unknown = {};
const server = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(answer));
});
const req = { headers: {}, id: "test" } as unknown as Request;
const ID = "665f00000000000000000001";

beforeAll(async () => {
    await new Promise<void>((ok) => server.listen(0, ok));
    process.env.MENU_SERVICE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => {
    server.closeAllConnections();
    server.close();
});

describe("menu-service answers, checked against @vmenu/contracts", () => {
    it("a well-formed order check passes through", async () => {
        answer = { items: [{ item: { _id: ID, name: "Amok", priceCents: 500, image: "/x", isEnabled: true }, quantity: 2 }] };
        expect(await httpClients.orderCheck(req, ID, { table: "1", items: [{ _id: ID, quantity: 2 }] })).toEqual(answer);
    });

    it("an order check in another shape is refused with 502", async () => {
        answer = { items: [{ item: { _id: ID, name: "Amok", priceCents: "5" }, quantity: 2 }] };
        await expect(httpClients.orderCheck(req, ID, { table: "1", items: [{ _id: ID, quantity: 2 }] })).rejects.toMatchObject({
            status: 502,
        });
    });

    it("so are counts in another shape", async () => {
        answer = { numOfTables: "4" };
        await expect(httpClients.menuCounts(req, ID)).rejects.toMatchObject({ status: 502 });
    });
});
