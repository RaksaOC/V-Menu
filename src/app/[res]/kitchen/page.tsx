'use client';

import Card from "./Card";

export default function KitchenPage() {
    const orderItems = [
        {
            id: "1",
            name: "Pizza",
            image: "",
            quantity: 1,
        },
        {
            id: "2",
            name: "Pizza",
            image: "",
            quantity: 1,
        },
        {
            id: "3",
            name: "Pizza",
            image: "",
            quantity: 1,
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