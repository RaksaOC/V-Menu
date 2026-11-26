// Demo data the tour scenes show.

export const DISHES = [
    { name: "Fish amok", price: 4.5, img: "/images/tour/amok.jpg" },
    { name: "Kuy teav", price: 2.5, img: "/images/tour/kuy-teav.jpg" },
    { name: "Beef lok lak", price: 5, img: "/images/tour/lok-lak.jpg" },
    { name: "Num banh chok", price: 2, img: "/images/tour/num-banh-chok.jpg" },
];

export const SERVICES = [
    {
        id: "restaurant",
        name: "restaurant-service",
        port: 4101,
        paths: ["/api/auth", "/api/restaurants", "/api/staff"],
        db: "vmenu_restaurants",
        owns: ["restaurants", "tenants"],
    },
    { id: "menu", name: "menu-service", port: 4102, paths: ["/api/menu"], db: "vmenu_menu", owns: ["items", "tables"] },
    { id: "order", name: "order-service", port: 4103, paths: ["/api/orders"], db: "vmenu_orders", owns: ["orders", "table_orders"] },
];
