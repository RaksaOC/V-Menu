import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtDecode} from 'jwt-decode';

interface DecodedToken {
    role?: string;
    exp?: number;

    [key: string]: any;
}

export function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const token = req.cookies.get('token')?.value;

    // Matches paths like /resSlug/cashier, /resSlug/kitchen, /resSlug/cashier/something
    const match = pathname.match(/^\/([^\/]+)\/(cashier|kitchen)(\/.*)?$/) || pathname.match(/^\/owner(\/.*)?$/);;

    if (match) {
        console.log("token", token);
        console.log("match", match);
        const resSlugInUrl = match[1];
        const roleInUrl = match[2] || "owner"; // "cashier" or "kitchen"

        console.log("role in url", resSlugInUrl);

        const isLoginPage = pathname === `/${resSlugInUrl}/${roleInUrl}/login` || pathname === `/owner/login`;

        if (!token) {
            if (!isLoginPage && roleInUrl !== "owner") {
                // Only redirect if not already on the login page.tsx
                return NextResponse.redirect(new URL(`/${resSlugInUrl}/${roleInUrl}/login`, req.url));
            } else if (roleInUrl === "owner") {
                return NextResponse.redirect(new URL(`/owner/login`, req.url));
            }
            return NextResponse.next();
        }

        try {
            // TODO: add expiration check logic
            const decoded = jwtDecode<DecodedToken>(token)
            console.log("decoded", decoded);
            if (decoded.exp && Date.now() / 1000 > decoded.exp) {
                console.log("Token expired");

                if (!isLoginPage && roleInUrl !== "owner") {
                    return NextResponse.redirect(new URL(`/${resSlugInUrl}/${roleInUrl}/login`, req.url));
                } else if (!isLoginPage && roleInUrl === "owner") {
                    return NextResponse.redirect(new URL(`/owner/login`, req.url));
                }
            }

            const expectedRole = roleInUrl === 'cashier' ? 'cashier' :
                roleInUrl === 'kitchen' ? 'chef' : roleInUrl === 'owner' ? 'owner' : null;

            console.log("expected role", expectedRole);

            const roleMatches = decoded.role === expectedRole;

            if (!roleMatches) {
                if (!isLoginPage && expectedRole !== "owner") {
                    return NextResponse.redirect(new URL(`/${resSlugInUrl}/${roleInUrl}/login`, req.url));
                }
                else if (!isLoginPage && expectedRole === "owner") {
                    return NextResponse.redirect(new URL(`/owner/login`, req.url));
                }
            }
        } catch (err) {
            // If token is invalid and not already on login page.tsx
            if (!isLoginPage && roleInUrl !== "owner") {
                return NextResponse.redirect(new URL(`/${resSlugInUrl}/${roleInUrl}/login`, req.url));
            }else if (!isLoginPage && roleInUrl === "owner") {
                return NextResponse.redirect(new URL(`/owner/login`, req.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/:res/:section/:path*', '/owner'],
};
