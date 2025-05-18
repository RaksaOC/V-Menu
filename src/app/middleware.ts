// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const pathname = req.nextUrl.pathname;

    // Public paths — always allow
    const publicPaths = ['/', '/signup', '/login'];
    if (publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
        return NextResponse.next();
    }

    // Match routes like /res/cashier/... or /res/kitchen/...
    const match = pathname.match(/^\/([^\/]+)\/(cashier|kitchen)(\/.*)?$/);
    if (match) {
        const restaurantSlug = match[1];
        const section = match[2]; // 'cashier' or 'kitchen'

        if (!token) {
            return NextResponse.redirect(new URL(`/${restaurantSlug}/${section}/login`, req.url));
        }
    }

    return NextResponse.next(); // Allow access
}

export const config = {
    matcher: ['/:res/:section/:path*'], // So it runs for /res/cashier/dashboard etc.
};
