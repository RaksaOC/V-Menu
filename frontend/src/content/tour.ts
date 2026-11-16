/* The landing-page tour: one entry per step. Words live here; pictures live in components/tour/scenes.tsx. */

export type SceneId = "intro" | "roles" | "flow" | "before" | "architecture" | "ownership" | "order" | "security" | "health" | "try";

export interface Step {
    id: SceneId;
    label: string; // short name in the progress rail
    eyebrow: string;
    title: string;
    lead: string;
    points: string[];
    note?: string;
}

export const STEPS: Step[] = [
    {
        id: "intro",
        label: "Welcome",
        eyebrow: "DevOps project · V-Menu",
        title: "V-Menu, as microservices",
        lead: "A QR-code ordering system for restaurants. Customers order from their table, the kitchen cooks, and the cashier closes the bill.",
        points: [
            "Started as one Next.js app with its API inside it",
            "Now three services, restaurant, menu and order, each with its own database",
            "This tour shows what it does and how the pieces fit",
        ],
    },
    {
        id: "roles",
        label: "Users",
        eyebrow: "Who uses it",
        title: "Four people, one order",
        lead: "Each person gets their own screen, and each screen talks to the services it needs.",
        points: [
            "Customer: scans the table's QR code and orders, no account needed",
            "Chef: sees the queue and marks dishes done",
            "Cashier: opens tables, switches dishes off, takes payment",
            "Owner: runs one or more restaurants, their menus, tables and staff",
        ],
    },
    {
        id: "flow",
        label: "Order flow",
        eyebrow: "What happens",
        title: "One order, start to finish",
        lead: "An order moves through three screens. Every arrow below is a REST call.",
        points: [
            "The cashier opens table 4, so its QR code starts working",
            "The customer orders; the kitchen screen checks for new orders every 2 seconds",
            "Orders for the same table add up on one bill until it is paid",
        ],
    },
    {
        id: "before",
        label: "Before",
        eyebrow: "Where we started",
        title: "One app doing everything",
        lead: "The original V-Menu ran its pages and 27 API routes in a single Next.js process, all sharing one database connection.",
        points: [
            "The database password and the token secret were written in the code",
            "The server trusted whatever user id the browser sent at sign-in",
            "Any logged-in user could edit any restaurant's menu",
            "One crash or one deploy took every screen down at once",
        ],
    },
    {
        id: "architecture",
        label: "Architecture",
        eyebrow: "The new shape",
        title: "Three services behind one front door",
        lead: "The browser still calls /api/... on the same site. Next.js forwards each path to the service that owns it.",
        points: [
            "restaurant-service (:4101): restaurants, staff and sign-in",
            "menu-service (:4102): dishes and tables",
            "order-service (:4103): orders, the kitchen queue, bills and stats",
        ],
        note: "Each service is a small Express app in TypeScript. They share no code and no database, so each can be changed, restarted or scaled on its own.",
    },
    {
        id: "ownership",
        label: "Data",
        eyebrow: "Database per service",
        title: "Each service owns its data",
        lead: "The six old collections are split by who is responsible for them.",
        points: [
            "A service reads and writes only its own database",
            "When it needs something else, it asks the owner over HTTP",
            "Internal routes need a shared key and are never forwarded from the browser",
        ],
    },
    {
        id: "order",
        label: "Calls",
        eyebrow: "Service-to-service",
        title: "Placing an order, call by call",
        lead: "One customer tap becomes three services working together. All of them log the same request id.",
        points: [
            "order-service asks restaurant-service which restaurant the link points to",
            "It asks menu-service whether the table is open and what each dish really costs",
            "Only then does it save the order and add it to the table's bill",
        ],
        note: "Prices come from menu-service, not from the browser, so a tampered cart cannot set its own price. If menu-service is down, the customer gets a clear 503 instead of a broken order.",
    },
    {
        id: "security",
        label: "Security",
        eyebrow: "Sign-in and access",
        title: "Who you are, and what you may do",
        lead: "Passwords stay with Firebase. Our services only ever see signed tokens.",
        points: [
            "restaurant-service checks the Firebase ID token against Google's public keys",
            "It then issues a 1-hour app token with one role and, for staff, one restaurant",
            "Every service checks that role and restaurant on every request",
            "Secrets live in .env files, never in the code or in git",
        ],
    },
    {
        id: "health",
        label: "Health",
        eyebrow: "Watching it run",
        title: "Each service reports on itself",
        lead: "Three small endpoints on every service make it easy to see what is going on.",
        points: [
            "/health: is the service up, and can it reach its database?",
            "/metrics: request count, response time, CPU and memory, for Prometheus",
            "Logs: one JSON line per request, tagged with the service and request id",
        ],
    },
    {
        id: "try",
        label: "Try it",
        eyebrow: "Your turn",
        title: "Open a restaurant",
        lead: "Create an owner account, add a few dishes and a table, open the table, then scan its QR code with your phone.",
        points: [
            "Sign up creates the restaurant and gives you all three roles",
            "Log in lets you choose a restaurant and a role",
            "The customer page needs no account",
        ],
    },
];
