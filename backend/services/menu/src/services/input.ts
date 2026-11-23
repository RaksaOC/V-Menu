import { badRequest } from "@vmenu/common";

/** A trimmed, non-empty string of at most `max` characters, or null. */
export const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

/** The `isEnabled` of an on/off request. */
export function flag(body: unknown) {
    const value = (body as { isEnabled?: unknown } | undefined)?.isEnabled;
    if (typeof value !== "boolean") throw badRequest("isEnabled must be true or false");
    return value;
}

export type Body = Record<string, unknown> | undefined;
