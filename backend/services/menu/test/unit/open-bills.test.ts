import { describe, expect, it } from "vitest";
import { tablesService } from "../../src/services/tables.service.js";
import { fakeTables } from "./fakes.js";

// VM-15: bills point at a table by its name. A table with an unpaid bill can't be renamed or
// deleted, or the bill would be split or left behind. order-service is mocked here.
const A = "665f00000000000000000001";
function setup(unpaid: string[] = []) {
    const tables = fakeTables();
    const asked: string[] = [];
    const bills = {
        async hasOpenBill(resId: string, name: string) {
            asked.push(`${resId}/${name}`);
            return unpaid.includes(name);
        },
    };
    return { tables, asked, bills, seating: tablesService({ tables }) };
}
const outcome = (p: Promise<unknown>) =>
    p.then(
        () => ({ status: 200 }),
        (e: { status?: number; code?: string; message?: string }) => ({ status: e.status, code: e.code, message: e.message }),
    );

describe("renaming and deleting a table with an unpaid bill (VM-15)", () => {
    it("rename: 409 when the table has an unpaid bill, and the name stays", async () => {
        const { seating, bills, tables } = setup(["4"]);
        const t = await seating.create(A, { type: "manual", name: "4" });
        expect(await outcome(seating.update(A, t._id, { name: "Patio" }, bills))).toEqual({
            status: 409,
            code: "TABLE_HAS_OPEN_BILL",
            message: "Table 4 has an unpaid bill. Mark it paid, then try again.",
        });
        expect(tables.all[0]!.name).toBe("4");
    });

    it("rename: 200 when it has none", async () => {
        const { seating, bills, asked } = setup();
        const t = await seating.create(A, { type: "manual", name: "4" });
        expect(await outcome(seating.update(A, t._id, { name: "Patio" }, bills))).toEqual({ status: 200 });
        expect(asked).toContain(`${A}/4`);
    });

    it("rename: 409 when a forgotten unpaid bill still has the new name", async () => {
        const { seating, bills } = setup(["Patio"]);
        const t = await seating.create(A, { type: "manual", name: "4" });
        expect(await outcome(seating.update(A, t._id, { name: "Patio" }, bills))).toMatchObject({
            status: 409,
            code: "TABLE_HAS_OPEN_BILL",
        });
    });

    it("opening, closing or keeping the same name doesn't ask order-service", async () => {
        const { seating, bills, asked } = setup(["4"]);
        const t = await seating.create(A, { type: "manual", name: "4" });
        expect(await outcome(seating.update(A, t._id, { name: "4", isEnabled: true }, bills))).toEqual({ status: 200 });
        expect(await outcome(seating.setEnabled(A, t._id, false))).toEqual({ status: 200 });
        expect(asked).toEqual([]);
    });

    it("delete: 409 when the table has an unpaid bill, and the table stays", async () => {
        const { seating, bills, tables } = setup(["4"]);
        const t = await seating.create(A, { type: "manual", name: "4" });
        expect(await outcome(seating.remove(A, t._id, bills))).toMatchObject({ status: 409, code: "TABLE_HAS_OPEN_BILL" });
        expect(tables.all).toHaveLength(1);
    });

    it("delete: 200 when it has none", async () => {
        const { seating, bills, tables } = setup();
        const t = await seating.create(A, { type: "manual", name: "4" });
        expect(await outcome(seating.remove(A, t._id, bills))).toEqual({ status: 200 });
        expect(tables.all).toHaveLength(0);
    });

    it("if order-service can't answer, nothing changes", async () => {
        const { seating, tables } = setup();
        const t = await seating.create(A, { type: "manual", name: "4" });
        const down = {
            hasOpenBill: async () => {
                throw Object.assign(new Error("A required service is unavailable"), { status: 503 });
            },
        };
        expect((await outcome(seating.remove(A, t._id, down))).status).toBe(503);
        expect((await outcome(seating.update(A, t._id, { name: "Patio" }, down))).status).toBe(503);
        expect(tables.all.map((x) => x.name)).toEqual(["4"]);
    });
});
