/* The product tour: one entry per step. Words live here; the pictures live in
   components/marketing/tour/Scenes.tsx. */

export type SceneId = "welcome" | "scan" | "order" | "kitchen" | "requests" | "bill" | "owner" | "team" | "start";

export interface Step {
    id: SceneId;
    label: string; // short name in the progress rail
    title: string;
    points: string[];
}

export const STEPS: Step[] = [
    { id: "welcome", label: "Welcome", title: "Meet V-Menu", points: ["No app for guests", "Live in one evening"] },
    { id: "scan", label: "Scan", title: "Scan the table", points: ["One QR code per table", "No app, no account"] },
    { id: "order", label: "Order", title: "Order from the phone", points: ["Photos and prices", "Sold out? Switch it off"] },
    { id: "kitchen", label: "Kitchen", title: "Straight to the kitchen", points: ["Live in seconds", "Done in one tap"] },
    { id: "requests", label: "Requests", title: "Guests call you over", points: ["Waiter or bill, one tap", "No more waving"] },
    { id: "bill", label: "Bill", title: "One bill per table", points: ["Every round adds up", "Printed receipts"] },
    { id: "owner", label: "Dashboard", title: "Your business at a glance", points: ["Sales and best sellers", "Every location"] },
    { id: "team", label: "Team", title: "A screen for every role", points: ["Invite staff by email", "Each sees only their job"] },
    { id: "start", label: "Start", title: "Open your first table tonight", points: ["Free to start", "Set up in minutes"] },
];
