import { MoneyProvider } from "@/components/money/MoneyProvider";

// VM-24: every page of a restaurant (customer, cashier, kitchen, staff) shows prices in its currency.
export default function RestaurantLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <MoneyProvider>{children}</MoneyProvider>;
}
