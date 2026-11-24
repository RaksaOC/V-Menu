import type { NextConfig } from "next";
import { securityHeaders } from "./security-headers";

// The browser only ever calls /api/* on this site. Next forwards each prefix to the service
// that owns it, so the frontend has no database access and no server secrets of its own.
const RESTAURANT = process.env.RESTAURANT_SERVICE_URL ?? "http://127.0.0.1:4101";
const MENU = process.env.MENU_SERVICE_URL ?? "http://127.0.0.1:4102";
const ORDER = process.env.ORDER_SERVICE_URL ?? "http://127.0.0.1:4103";

const nextConfig: NextConfig = {
    poweredByHeader: false,
    // small self-contained server for the Docker image (frontend/Dockerfile)
    output: "standalone",
    devIndicators: false,
    // existing unused-import lint errors would otherwise fail production builds
    eslint: { ignoreDuringBuilds: true },
    // SEC-02: security headers on every page. The CSP starts as report-only; build with
    // CSP_MODE=enforce to enforce it (a build argument of the frontend image).
    async headers() {
        return [
            {
                source: "/((?!api/).*)",
                headers: securityHeaders({
                    dev: process.env.NODE_ENV !== "production",
                    analytics: Boolean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
                    mode: process.env.CSP_MODE === "enforce" ? "enforce" : "report-only",
                }),
            },
        ];
    },
    async rewrites() {
        return [
            { source: "/api/auth/:path*", destination: `${RESTAURANT}/api/auth/:path*` },
            { source: "/api/restaurants", destination: `${RESTAURANT}/api/restaurants` },
            { source: "/api/restaurants/:path*", destination: `${RESTAURANT}/api/restaurants/:path*` },
            { source: "/api/staff", destination: `${RESTAURANT}/api/staff` },
            { source: "/api/menu/:path*", destination: `${MENU}/api/menu/:path*` },
            { source: "/api/orders/:path*", destination: `${ORDER}/api/orders/:path*` },
            // health of each service, for the status pill on the landing page
            { source: "/api/health/restaurant", destination: `${RESTAURANT}/ready` },
            { source: "/api/health/menu", destination: `${MENU}/ready` },
            { source: "/api/health/order", destination: `${ORDER}/ready` },
        ];
    },
};

export default nextConfig;
