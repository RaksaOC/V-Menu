import { ChefHat, QrCode, ReceiptText, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BillCard } from "../mocks/BillCard";
import { KitchenBoard } from "../mocks/KitchenBoard";
import { PhoneMenu } from "../mocks/PhoneMenu";
import { QrScan } from "../mocks/SmallMocks";
import s from "./landing.module.css";

export interface StoryStep {
    icon: LucideIcon;
    title: string;
    points: string[];
    scene: () => ReactNode;
}

/** The four moments of a table's visit, each with the picture shown beside it. */
export const STORY: StoryStep[] = [
    {
        icon: QrCode,
        title: "Scan the table",
        points: ["No app needed", "One code per table"],
        scene: () => <QrScan big />,
    },
    {
        icon: UtensilsCrossed,
        title: "Order from the phone",
        points: ["Photos and kitchen notes", "Order again any time"],
        scene: () => <PhoneMenu />,
    },
    {
        icon: ChefHat,
        title: "Straight to the kitchen",
        points: ["Live in seconds", "Done in one tap"],
        scene: () => (
            <div className={s.boardFrame}>
                <KitchenBoard />
            </div>
        ),
    },
    {
        icon: ReceiptText,
        title: "Pay in a tap",
        points: ["One bill per table", "Printed receipts"],
        scene: () => <BillCard />,
    },
];
