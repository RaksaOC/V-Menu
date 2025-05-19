import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDB } from "@/app/shared/lib/db";
import { Tenant } from "@/app/shared/model/Tenant";

// Define your secret key (should be from an env var in production)
const JWT_SECRET = "superSecretKey123!@#_change_this_in_production";

interface DecodedToken {
    email: string;
    role: string;
    res: string;
    exp: number;
    [key: string]: any;
}

// -------------------------------------------
// 1. Extract token from Authorization header
function extractToken(req: Request): string | null {
    const authHeader = req.headers.get("authorization"); // e.g., "Bearer <token>"
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;

    return parts[1];
}

// -------------------------------------------
// 2. Verify token using JWT
function verifyToken(token: string): DecodedToken | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        return decoded;
    } catch (err) {
        console.error("JWT verification failed:", err);
        return null;
    }
}

// -------------------------------------------
// 3. Wrap handler with auth check
export function withAuthRouteHandler(handler: (req: NextRequest, context?: any, user?: any) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
        const token = extractToken(req);
        if (!token) {
            return NextResponse.json({ message: "No token provided" }, { status: 401 });
        }

        const user = verifyToken(token);
        if (!user) {
            return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
        }

        console.log("User is verified", user);

        // Attach resId from DB if needed
        await connectToDB();
        const tenant = await Tenant.findOne({ tenantId: user.uid }); // or use user.res if that's what you store
        if (tenant) {
            user.resId = tenant.resId;
        }

        console.log("After attaching resId", user);

        return handler(req, context, user);
    };
}
