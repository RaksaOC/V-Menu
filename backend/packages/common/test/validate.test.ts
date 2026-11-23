import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { finish, HttpError, parse, validate } from "../src/index.js";

// CL-05 / VM-17: a bad body is a 400 that names the fields, so the form can show where.
const Body = z.object({ name: z.string().trim().min(1, "Required"), price: z.number("Must be a number").min(0, "Can't be negative") });

function app() {
    const a = express();
    a.use(express.json());
    a.post("/items", validate(Body), (req, res) => {
        res.json(req.body);
    });
    return finish(a);
}

describe("validate(schema)", () => {
    it("passes the parsed body on: trimmed, unknown fields dropped", async () => {
        const res = await request(app()).post("/items").send({ name: " Amok ", price: 5, resId: "smuggled" });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: "Amok", price: 5 });
    });

    it("answers 400 INVALID_INPUT with a message per field", async () => {
        const res = await request(app()).post("/items").send({ name: "", price: "five" });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            code: "INVALID_INPUT",
            message: "Please check: name, price",
            fields: { name: "Required", price: "Must be a number" },
        });
    });

    it("a missing body is checked like an empty one", async () => {
        const res = await request(app()).post("/items");
        expect(res.status).toBe(400);
        expect(Object.keys(res.body.fields)).toEqual(["name", "price"]);
    });
});

describe("parse(schema, data)", () => {
    it("answers the parsed value, or throws the same 400", () => {
        expect(parse(Body, { name: "A", price: 1 })).toEqual({ name: "A", price: 1 });
        try {
            parse(Body, { name: "A", price: -1 });
            expect.unreachable();
        } catch (e) {
            expect(e).toBeInstanceOf(HttpError);
            expect((e as HttpError).status).toBe(400);
            expect((e as HttpError).fields).toEqual({ price: "Can't be negative" });
        }
    });

    it("a problem with the whole value is reported as 'body'", () => {
        expect(() => parse(z.string(), 5)).toThrow(expect.objectContaining({ fields: { body: expect.any(String) } }));
    });
});
