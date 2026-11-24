/** A trimmed, non-empty string of at most `max` characters, or null. */
export const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

export type Body = Record<string, unknown> | undefined;
