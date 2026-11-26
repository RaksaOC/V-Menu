"use client";

import { useParams } from "next/navigation";

/**
 * Which table a customer page is about (SEC-04). A QR code opens /<slug>/t/<token>: the table's
 * own random link, and the browser never sends the table's name. The older /<slug>/customer/<name>
 * pages still exist for local testing; the services refuse them unless ALLOW_TABLE_NAME_LINKS=true.
 */
export interface TableLink {
    slug: string;
    /** the link token, or null on a page addressed by name */
    token: string | null;
    /** the table's name from the URL (old pages only; with a token the server says it) */
    name: string;
    /** the page's own address: the menu, with /cart and /orders/<id> below it */
    base: string;
    /** the key of this table's cart in the browser (VM-05) */
    cartId: string;
}

export function useTableLink(): TableLink {
    const params = useParams<{ res?: string; token?: string; table?: string }>();
    const slug = String(params?.res ?? "");
    const token = params?.token ? String(params.token) : null;
    const name = token ? "" : decodeURIComponent(String(params?.table ?? ""));
    const base = token ? `/${slug}/t/${encodeURIComponent(token)}` : `/${slug}/customer/${encodeURIComponent(name)}`;
    return { slug, token, name, base, cartId: token ?? name };
}
