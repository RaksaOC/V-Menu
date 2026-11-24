import { badRequest } from "@vmenu/common";

/** A positive whole number from the query string, or the default when it's missing. */
function whole(value: unknown, fallback: number, name: string) {
    if (value === undefined || value === "") return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) throw badRequest(`${name} must be a whole number from 1`);
    return n;
}

/** ?page=&limit= for history lists (VM-10, VM-11): 20 a page by default, at most 100. */
export function paging(query: { page?: unknown; limit?: unknown }) {
    const page = whole(query.page, 1, "page");
    const limit = Math.min(whole(query.limit, 20, "limit"), 100);
    return { page, limit, skip: (page - 1) * limit };
}

export const pages = (total: number, limit: number) => Math.max(1, Math.ceil(total / limit));
