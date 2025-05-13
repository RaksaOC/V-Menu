'use client';

import Card from "@/app/[res]/customer/Card";
import {Item} from "@/app/[res]/types/Item";

export default function CustomerPage() {
    const items: Item[] = [
        {
            id: "1",
            name: "Cheeseburger",
            image: "/images/cheeseburger.jpg",
            quantity: 0,
            price: 8.99,
        },
        {
            id: "2",
            name: "Margherita Pizza",
            image: "/images/pizza.jpg",
            quantity: 0,
            price: 12.49,
        },
        {
            id: "3",
            name: "Grilled Chicken Salad",
            image: "/images/salad.jpg",
            quantity: 0,
            price: 10.5,
        },
        {
            id: "4",
            name: "Fries",
            image: "/images/fries.jpg",
            quantity: 0,
            price: 3.25,
        },
        {
            id: "5",
            name: "Spaghetti Bolognese",
            image: "/images/spaghetti.jpg",
            quantity: 0,
            price: 11.75,
        },
        {
            id: "6",
            name: "Tacos",
            image: "/images/tacos.jpg",
            quantity: 0,
            price: 9.0,
        },
        {
            id: "7",
            name: "Chicken Wings",
            image: "/images/wings.jpg",
            quantity: 0,
            price: 7.5,
        },
        {
            id: "8",
            name: "Caesar Salad",
            image: "/images/caesar.jpg",
            quantity: 0,
            price: 9.25,
        },
        {
            id: "9",
            name: "Ice Cream Sundae",
            image: "/images/sundae.jpg",
            quantity: 0,
            price: 5.0,
        },
        {
            id: "10",
            name: "Iced Coffee",
            image: "/images/iced-coffee.jpg",
            quantity: 0,
            price: 4.0,
        }
    ];
    return(
        items.map((item, index) => (
            <Card key={index} id={item.id} name={item.name} image={item.image} price={item.price} />
        ))
    )
}
