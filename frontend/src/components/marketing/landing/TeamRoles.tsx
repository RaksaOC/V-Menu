import { ChefHat, LayoutDashboard, ReceiptText, Smartphone, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { BillCard } from "../mocks/BillCard";
import { PhoneMenu } from "../mocks/PhoneMenu";
import { RequestFeed } from "../mocks/RequestFeed";
import s from "./landing.module.css";

export interface Role {
    id: string;
    name: string;
    icon: LucideIcon;
    headline: string;
    points: string[];
    art: ReactNode;
}

/** What each person on the team gets, with a picture of their screen. */
export const ROLES: Role[] = [
    {
        id: "guests",
        name: "Guests",
        icon: Smartphone,
        headline: "Order when ready.",
        points: ["Any phone browser", "Notes for the kitchen", "Call staff or ask for the bill"],
        art: <PhoneMenu table="Table 2" />,
    },
    {
        id: "kitchen",
        name: "Kitchen",
        icon: ChefHat,
        headline: "A calm, clear queue.",
        points: ["Light or dark", "Done in one tap", "Full order history"],
        art: (
            <Image
                src="/images/landing/kitchen.png"
                alt="The V-Menu kitchen screen showing a table's order with photos of each dish"
                width={1152}
                height={900}
                className={s.shot}
            />
        ),
    },
    {
        id: "cashier",
        name: "Cashier",
        icon: ReceiptText,
        headline: "Bills, always right.",
        points: ["Every round on one bill", "Sold-out switch", "Printed receipts"],
        art: (
            <div className={s.duo}>
                <BillCard table="Table 7" />
                <RequestFeed show={2} />
            </div>
        ),
    },
    {
        id: "owner",
        name: "Owner",
        icon: LayoutDashboard,
        headline: "Your business at a glance.",
        points: ["Menu with photos", "Staff invites", "Sales at a glance"],
        art: (
            <Image
                src="/images/landing/dashboard.png"
                alt="The V-Menu owner dashboard with live counts of active tables, unpaid orders and payments"
                width={1440}
                height={830}
                className={s.shot}
            />
        ),
    },
];
