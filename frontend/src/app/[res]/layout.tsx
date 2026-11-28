import type { Metadata } from "next";
import { MoneyProvider } from "@/components/money/MoneyProvider";

// A restaurant's own pages (its tables, kitchen and cashier screens) stay out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// VM-24: every page of a restaurant (customer, cashier, kitchen, staff) shows prices in its currency.
export default function RestaurantLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <MoneyProvider>{children}</MoneyProvider>;
}
