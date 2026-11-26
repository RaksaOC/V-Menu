import { expect } from "vitest";
import type { z } from "zod";

// CL-05: helpers for the schema tests: valid and invalid examples for every schema.
export const ID = "665f00000000000000000001";
export const ok = (schema: z.ZodType, value: unknown) => expect(schema.safeParse(value).success, JSON.stringify(value)).toBe(true);
/** The fields a value is refused for (it must be refused). */
export const fieldsOf = (schema: z.ZodType, value: unknown) => {
    const r = schema.safeParse(value);
    expect(r.success, JSON.stringify(value)).toBe(false);
    return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};
