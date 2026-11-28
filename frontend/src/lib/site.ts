// What search engines and link previews say about V-Menu, kept in one place.

/** The public address. SITE_URL overrides it at run time (a preview or a custom domain). */
export const SITE_URL = (process.env.SITE_URL ?? "https://v-menu.chanraksa.com").replace(/\/$/, "");

export const SITE_NAME = "V-Menu";

export const SITE_TITLE = "V-Menu · QR code menus and table ordering for restaurants";

export const SITE_DESCRIPTION =
    "Let guests order from their phone with a QR code on every table. V-Menu sends orders to a live kitchen screen in seconds, keeps one bill per table and shows your sales at a glance. Free to start, set up in minutes.";

export const SITE_KEYWORDS = [
    "QR code menu",
    "QR menu for restaurants",
    "table ordering system",
    "contactless ordering",
    "digital menu",
    "kitchen display system",
    "restaurant POS",
    "restaurant ordering software",
    "order at table",
    "restaurant management",
];

/**
 * Only the real site is indexed. Staging, previews and local copies run the same build, so the
 * answer depends on the host the request came to.
 */
export function isIndexedHost(host: string | null): boolean {
    if (!host) return false;
    return host.split(":")[0].toLowerCase() === new URL(SITE_URL).hostname;
}
