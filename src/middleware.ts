import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const token = req.cookies.get('token')?.value;

    // ✅ 1. Public paths should always be allowed
    const publicPaths = ['/', '/signup', '/login'];
    if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
        return NextResponse.next();
    }

    // ✅ 2. Check if it's a dynamic tenant login page, e.g., /res/cashier/login
    const loginMatch = pathname.match(/^\/[^\/]+\/(cashier|kitchen)\/login\/?$/);
    if (loginMatch) {
        return NextResponse.next(); // Allow tenant login pages
    }

    // ✅ 3. Match protected tenant routes like /res/cashier/...
    const match = pathname.match(/^\/([^\/]+)\/(cashier|kitchen)(\/.*)?$/);
    if (match) {
        if (!token) {
            const res = match[1];       // The restaurant slug
            const section = match[2];   // "cashier" or "kitchen"

            // Redirect to tenant login
            return NextResponse.redirect(new URL(`/${res}/${section}/login`, req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/:res/:section/:path*'], // triggers on dynamic routes
};
