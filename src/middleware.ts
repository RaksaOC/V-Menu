import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    role?: string;
    exp?: number;
    [key: string]: any;
}

export function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const token = req.cookies.get('token')?.value;

    // Matches paths like /resSlug/cashier, /resSlug/kitchen, /resSlug/cashier/something
    const match = pathname.match(/^\/([^\/]+)\/(cashier|kitchen)(\/.*)?$/);

    if (match) {
        console.log("token", token);
        console.log("match", match);
        const resSlugInUrl = match[1];
        const roleInUrl = match[2]; // "cashier" or "kitchen"

        console.log("role in url",resSlugInUrl);

        const isLoginPage = pathname === `/${resSlugInUrl}/${roleInUrl}/login`;

        if (!token) {
            if (!isLoginPage) {
                // Only redirect if not already on the login page.tsx
                return NextResponse.redirect(new URL(`/${resSlugInUrl}/${roleInUrl}/login`, req.url));
            }
            return NextResponse.next();
        }

        try {
            const decoded = jwtDecode<DecodedToken>(token);
            console.log("decoded", decoded);

            const expectedRole = roleInUrl === 'cashier' ? 'cashier' :
                roleInUrl === 'kitchen' ? 'chef' : null;

            console.log("expected role", expectedRole);

            const roleMatches = decoded.role === expectedRole;

            if (!roleMatches) {
                if (!isLoginPage) {
                    return NextResponse.redirect(new URL(`/${resSlugInUrl}/${roleInUrl}/login`, req.url));
                }
            }
        } catch (err) {
            // If token is invalid and not already on login page.tsx
            if (!isLoginPage) {
                return NextResponse.redirect(new URL(`/${resSlugInUrl}/${roleInUrl}/login`, req.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/:res/:section/:path*'],
};
