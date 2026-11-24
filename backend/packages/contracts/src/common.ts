import { z } from "zod";

// Shared building blocks and constants (CL-05).

export const ROLES = ["owner", "cashier", "chef"] as const;
export const Role = z.enum(ROLES, "Must be owner, cashier or chef");
export type Role = z.infer<typeof Role>;

export const STAFF_ROLES = ["cashier", "chef"] as const;
export const StaffRole = z.enum(STAFF_ROLES, "Must be cashier or chef");
export type StaffRole = z.infer<typeof StaffRole>;

/** A MongoDB id as the API sends it. */
export const ObjectId = z.string("Must be an id").regex(/^[a-f0-9]{24}$/i, "Must be a 24-character id");

/** SEC-04: a table's link token: 16 random bytes in base64url. */
export const QrToken = z.string("Must be a table link").regex(/^[A-Za-z0-9_-]{22}$/, "Must be a table link");

/** Trimmed text, 1 to `max` characters. */
export const text = (max: number) =>
    z
        .string({ error: (issue) => (issue.input === undefined ? "Required" : "Must be text") })
        .trim()
        .min(1, "Required")
        .max(max, `At most ${max} characters`);

/** Text or a number (a table can be called 7), as trimmed text. */
export const label = (max: number) => z.union([z.string(), z.number()], "Must be text").transform(String).pipe(text(max));

export const Email = z
    .string("Must be an email address")
    .trim()
    .toLowerCase()
    .max(200, "At most 200 characters")
    .email("Must be an email address");

/** CL-07: an amount of money: whole cents, never negative, at most $1,000,000. */
export const Cents = z
    .number("Must be a number")
    .int("Must be a whole number of cents")
    .min(0, "Can't be negative")
    .max(100_000_000, "At most $1,000,000");

/** Dates arrive as ISO strings in JSON. */
export const IsoDate = z.string();

/** One page of a history list (VM-10, VM-11). */
export const pageOf = <T extends z.ZodType>(rows: T, key: "orders" | "bills") =>
    z.object({ [key]: z.array(rows), page: z.number().int(), limit: z.number().int(), total: z.number().int(), pages: z.number().int() });
