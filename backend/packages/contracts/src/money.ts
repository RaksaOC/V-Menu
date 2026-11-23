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

/**
 * VM-24: how a restaurant shows prices. Prices are kept in US cents; riel is worked out for
 * display, at the restaurant's own rate.
 */
export interface MoneySettings {
    currency: "USD" | "KHR" | "both";
    /** riel for one US dollar, a whole number */
    khrPerUsd: number;
}
export const DEFAULT_MONEY: MoneySettings = { currency: "USD", khrPerUsd: 4100 };

const dollars = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Riel, rounded half up to the nearest 100, as prices are paid in cash. Whole-number maths only. */
function riel(cents: number, khrPerUsd: number) {
    const hundreds = Math.floor((cents * khrPerUsd + 5000) / 10000);
    return `៛${(hundreds * 100).toLocaleString("en-US")}`;
}

/**
 * Cents as a price, in the restaurant's currency: "$1,225.25", "៛5,000", or "$1.25 · ៛5,100".
 * The pages call it through useMoney(), which knows the restaurant's settings.
 */
export function formatMoney(cents: number, money: MoneySettings = DEFAULT_MONEY): string {
    if (money.currency === "KHR") return riel(cents, money.khrPerUsd);
    if (money.currency === "both") return `${dollars(cents)} · ${riel(cents, money.khrPerUsd)}`;
    return dollars(cents);
}
