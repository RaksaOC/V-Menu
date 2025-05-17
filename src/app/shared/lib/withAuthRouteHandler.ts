import {NextRequest, NextResponse} from "next/server";
import admin from "@/app/shared/firebase/admin";
import {Tenant} from "@/app/shared/model/Tenant";
import {connectToDB} from "@/app/shared/lib/db";

// -------------------------------------------
// 1. Extract the token from the Authorization header
function extractToken(req: Request): string | null {
    console.log("request is", req);
    const authHeader = req.headers.get("authorization"); // e.g., "Bearer <token>"
    console.log("authHeader", authHeader);
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;

    return parts[1]; // the actual token
}

// -------------------------------------------
// 2. Verify the token using Firebase Admin SDK
async function verifyToken(token: string) {
    try {
        return await admin.auth().verifyIdToken(token); // decoded user info
    } catch (err) {
        console.error("Token verification failed:", err);
        return null;
    }
}

// -------------------------------------------
// 3. Main wrapper: adds auth check before calling your real handler
export function withAuthRouteHandler(handler: (req: NextRequest, context?: any, user?: any) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
        // Extract token from header
        const token = extractToken(req);
        if (!token) {
            return NextResponse.json({message: "No token provided"}, {status: 401});
        }

        // Verify token and get user
        const user = await verifyToken(token);
        if (!user) {
            return NextResponse.json({message: "Invalid or expired token"}, {status: 401});
        }

        console.log("User is verfied", user);

        // get resId and attach to user
        await connectToDB();
        const tenant = await Tenant.findOne({tenantId: user.uid});
        if (tenant) {
            user.resId = tenant.resId;
        }

        // All good — call your original function with the user included
        return handler(req, context, user);
    };
}

