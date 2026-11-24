// B5: the serious and critical axe issues each page had when the check came in, by
// "<page>:<theme>" and axe rule id. a11y.spec.ts fails on any issue not listed here. VM-36 fixes
// these and empties the list; don't add to it.
export const KNOWN: Record<string, string[]> = {
    "landing:light": ["color-contrast"],
    "landing:dark": ["color-contrast"],
    "login:light": ["color-contrast"],
    "login:dark": ["color-contrast"],
    "signup:light": ["color-contrast", "label"],
    "signup:dark": ["label"],
    "ui-kit:light": ["color-contrast"],
    "ui-kit:dark": ["color-contrast"],
    "owner-login:light": ["color-contrast"],
    "owner-login:dark": ["color-contrast"],
    "owner:light": ["color-contrast"],
    "cashier-login:light": ["color-contrast"],
    "cashier-login:dark": ["color-contrast"],
    "cashier:light": ["color-contrast"],
    "cashier-overview:light": ["color-contrast"],
    "cashier-tables:light": ["color-contrast"],
    "cashier-orders:light": ["color-contrast"],
    "cashier-menu:light": ["color-contrast"],
    "kitchen-login:light": ["color-contrast"],
    "kitchen-login:dark": ["color-contrast"],
    "kitchen:light": ["color-contrast"],
    "customer-no-table:light": ["color-contrast"],
};
