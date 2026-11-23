import type { Bill, MenuItem, Order, Overview, Restaurant, StaffMember, Table } from "@vmenu/contracts";

// API answers the frontend tests mock, typed by @vmenu/contracts and checked against its schemas
// (test/contracts.test.ts), so a mock can't drift from what the services really send (CL-05).
export const dish: MenuItem = { _id: "665f00000000000000000011", name: "Kuy Teav", price: 2.5, image: "/k.jpg", isEnabled: true };
export const table: Table = { _id: "665f00000000000000000021", name: "T1", isEnabled: true };
export const order: Order = {
    _id: "665f00000000000000000031",
    table: "T1",
    isDone: false,
    createdAt: "2026-11-23T10:00:00.000Z",
    orderedItems: [{ item: dish, quantity: 2 }],
};
export const bill: Bill = {
    _id: "665f00000000000000000041",
    table: "T1",
    isPaid: false,
    createdAt: "2026-11-23T10:00:00.000Z",
    orders: [order],
};
export const overview: Overview = {
    numOfActiveTables: 1,
    numOfUnpaidOrders: 0,
    numOfTables: 4,
    numOfItems: 4,
    numOfOrders: 2,
    numOfPayments: 1,
};
export const restaurant: Restaurant = { _id: "665f00000000000000000001", name: "Demo Bistro", slug: "demo-bistro", ownerId: "owner1" };
export const staffMember: StaffMember = {
    _id: "665f00000000000000000051",
    name: "Bob",
    tenantId: "bob",
    email: "bob@x.test",
    role: "chef",
    resId: "665f00000000000000000001",
    createdAt: "2026-11-23T10:00:00.000Z",
    updatedAt: "2026-11-23T10:00:00.000Z",
};
