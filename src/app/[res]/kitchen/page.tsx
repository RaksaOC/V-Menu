'use client';

import Card from "./Card";
import {Item} from "@/app/shared/types/Item";

export default function KitchenPage() {
    const orderItems : Item[] = [
        {
            id: "1",
            name: "Pizza",
            image: "",
            quantity: 1,
            price: 0
        },
        {
            id: "2",
            name: "Pizza",
            image: "",
            quantity: 1,
            price: 0
        },
        {
            id: "3",
            name: "Pizza",
            image: "",
            quantity: 1,
            price: 0
        }
    ]

    return (
        <Card
            key={orderItems[0].id}
            orderId={"01010101"}
            table={"1"}
            orders={orderItems}
            isDone={false}
            onDone={function (orderId: string): void {
                console.log(orderId);
            }}
        ></Card>
    )
}