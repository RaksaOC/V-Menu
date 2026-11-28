// Sample data for the product pictures on the landing page and in the tour.

export interface Dish {
    name: string;
    price: number;
    img: string;
    tag?: string;
}

export const DISHES: Dish[] = [
    { name: "Fish amok", price: 4.5, img: "/images/tour/amok.jpg", tag: "Seafood" },
    { name: "Kuy teav", price: 2.5, img: "/images/tour/kuy-teav.jpg" },
    { name: "Beef lok lak", price: 5, img: "/images/tour/lok-lak.jpg", tag: "Spicy" },
    { name: "Num banh chok", price: 2, img: "/images/tour/num-banh-chok.jpg" },
];

export const RESTAURANT = "Mee Keav";

export interface Ticket {
    table: string;
    items: string[];
    note?: string;
}

export const TICKETS: Ticket[] = [
    { table: "Table 4", items: ["2× Fish amok", "1× Kuy teav"], note: "No chilli, please" },
    { table: "Table 7", items: ["1× Beef lok lak", "2× Iced coffee"] },
    { table: "Table 2", items: ["3× Num banh chok"] },
    { table: "Table 9", items: ["1× Fish amok", "1× Lime juice"], note: "Birthday dessert later" },
    { table: "Table 5", items: ["2× Kuy teav"] },
    { table: "Table 1", items: ["1× Beef lok lak", "1× Kuy teav"] },
];

export const REQUESTS = [
    { table: "Table 3", text: "is calling a waiter" },
    { table: "Table 7", text: "asked for the bill" },
    { table: "Table 12", text: "needs more water" },
    { table: "Table 4", text: "asked for the bill" },
];

export const money = (n: number) => `$${n.toFixed(2)}`;
