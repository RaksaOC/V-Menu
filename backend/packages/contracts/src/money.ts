// CL-07: the API and the database keep money as whole cents. These two helpers are the only place
// that converts: toCents for an amount someone typed, formatMoney for showing it. This file imports
// nothing, so the frontend's bundle can use it without pulling in zod.

/**
 * Whole cents from an amount in dollars, rounding half up: toCents(2.35) is 235, and
 * toCents(0.1 + 0.2) is 30. Shifting the decimal point in text avoids binary rounding: 1.005 * 100
 * is 100.49999..., but "1.005e2" is exactly 100.5.
 */
export function toCents(amount: number): number {
    const shifted = Number(`${amount}e2`);
    return Math.round(Number.isNaN(shifted) ? amount * 100 : shifted);
}

/** Cents as a price: 122525 is "$1,225.25". */
export function formatMoney(cents: number): string {
    return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
