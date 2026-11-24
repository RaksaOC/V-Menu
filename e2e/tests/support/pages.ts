import type { Locator, Page } from "@playwright/test";
import { SLUG } from "./auth";

// B5: every page of the app, with a real address to open it at. The axe check (a11y.spec.ts)
// visits each one; scripts/screens-a11y.test.mjs checks that every page.tsx in frontend/src/app
// is listed here, so a new page can't be missed.

/** What a page needs to be opened: a table of its own, its QR token, and an order placed at it. */
export interface PageContext {
    table: string;
    token: string;
    orderId: string;
}

export interface AppPage {
    /** a short name, used in test titles and in the known-issues list */
    name: string;
    /** the route, as its folder under frontend/src/app */
    route: string;
    path: (c: PageContext) => string;
    /** who is signed in, if anyone */
    as?: "owner" | "cashier" | "chef";
    /** for the cashier dashboard: which section is open */
    section?: "overview" | "tables" | "orders" | "menu";
    /** something that shows once the page has loaded its data */
    ready: (page: Page) => Locator;
}

const heading = (name: string | RegExp) => (page: Page) => page.getByRole("heading", { name }).first();

export const PAGES: AppPage[] = [
    { name: "landing", route: "/", path: () => "/", ready: (p) => p.locator("main").first() },
    { name: "login", route: "/login", path: () => "/login", ready: (p) => p.locator("form") },
    { name: "signup", route: "/signup", path: () => "/signup", ready: (p) => p.locator("form") },
    { name: "ui-kit", route: "/ui-kit", path: () => "/ui-kit", ready: heading(/UI kit/i) },
    { name: "owner-login", route: "/owner/login", path: () => "/owner/login", ready: (p) => p.locator("form") },
    { name: "owner", route: "/owner", path: () => "/owner", as: "owner", ready: heading("Restaurant Management") },
    { name: "restaurant", route: "/[res]", path: () => `/${SLUG}`, ready: heading("Demo Bistro") },
    { name: "cashier-login", route: "/[res]/cashier/login", path: () => `/${SLUG}/cashier/login`, ready: (p) => p.locator("form") },
    // redirects to the dashboard
    { name: "cashier", route: "/[res]/cashier", path: () => `/${SLUG}/cashier`, as: "cashier", ready: heading(/Overview/) },
    ...(["overview", "tables", "orders", "menu"] as const).map((section): AppPage => ({
        name: `cashier-${section}`,
        route: "/[res]/cashier/dashboard",
        path: () => `/${SLUG}/cashier/dashboard`,
        as: "cashier",
        section,
        ready: heading(new RegExp(section === "tables" ? "^Tables" : section === "menu" ? "Menu" : section, "i")),
    })),
    { name: "kitchen-login", route: "/[res]/kitchen/login", path: () => `/${SLUG}/kitchen/login`, ready: (p) => p.locator("form") },
    {
        name: "kitchen",
        route: "/[res]/kitchen",
        path: () => `/${SLUG}/kitchen`,
        as: "chef",
        ready: (p) => p.getByRole("region", { name: "New" }),
    },
    {
        name: "kitchen-history",
        route: "/[res]/kitchen/history",
        path: () => `/${SLUG}/kitchen/history`,
        as: "chef",
        ready: heading("Kitchen History"),
    },
    { name: "customer-no-table", route: "/[res]/customer", path: () => `/${SLUG}/customer`, ready: heading(/./) },
    { name: "customer-menu", route: "/[res]/customer/[table]", path: (c) => `/${SLUG}/customer/${c.table}`, ready: heading("Our Menu") },
    { name: "cart", route: "/[res]/customer/[table]/cart", path: (c) => `/${SLUG}/customer/${c.table}/cart`, ready: heading(/Your Cart/) },
    {
        name: "order",
        route: "/[res]/customer/[table]/orders/[orderId]",
        path: (c) => `/${SLUG}/customer/${c.table}/orders/${c.orderId}`,
        ready: heading(/sent to the kitchen/),
    },
    { name: "link-menu", route: "/[res]/t/[token]", path: (c) => `/${SLUG}/t/${c.token}`, ready: heading("Our Menu") },
    { name: "link-cart", route: "/[res]/t/[token]/cart", path: (c) => `/${SLUG}/t/${c.token}/cart`, ready: heading(/Your Cart/) },
    {
        name: "link-order",
        route: "/[res]/t/[token]/orders/[orderId]",
        path: (c) => `/${SLUG}/t/${c.token}/orders/${c.orderId}`,
        ready: heading(/sent to the kitchen/),
    },
];
