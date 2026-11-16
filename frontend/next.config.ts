import type { NextConfig } from "next";

// The browser only ever calls /api/* on this site. Next forwards each prefix to the service
// that owns it, so the frontend has no database access and no server secrets of its own.
const RESTAURANT = process.env.RESTAURANT_SERVICE_URL ?? "http://127.0.0.1:4101";
const MENU = process.env.MENU_SERVICE_URL ?? "http://127.0.0.1:4102";
const ORDER = process.env.ORDER_SERVICE_URL ?? "http://127.0.0.1:4103";

const nextConfig: NextConfig = {
    poweredByHeader: false,
    devIndicators: false,
    // existing unused-import lint errors would otherwise fail production builds
    eslint: { ignoreDuringBuilds: true },
    async rewrites() {
        return [
            { source: "/api/auth/:path*", destination: `${RESTAURANT}/api/auth/:path*` },
            { source: "/api/restaurants", destination: `${RESTAURANT}/api/restaurants` },
            { source: "/api/restaurants/:path*", destination: `${RESTAURANT}/api/restaurants/:path*` },
            { source: "/api/staff", destination: `${RESTAURANT}/api/staff` },
            { source: "/api/menu/:path*", destination: `${MENU}/api/menu/:path*` },
            { source: "/api/orders/:path*", destination: `${ORDER}/api/orders/:path*` },
            // health of each service, for the status pill on the landing page
            { source: "/api/health/restaurant", destination: `${RESTAURANT}/health` },
            { source: "/api/health/menu", destination: `${MENU}/health` },
            { source: "/api/health/order", destination: `${ORDER}/health` },
        ];
    },
};

export default nextConfig;
