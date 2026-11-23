/** Dollars with two decimals and thousands separators: 1225.5 → "$1,225.50". */
export const formatDollars = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
