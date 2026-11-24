import type { NextFunction, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { forbidden, unauthorized } from "./errors.js";

export type Role = "owner" | "cashier" | "chef";

// What every service knows about the caller, read from the app token restaurant-service signs.
export interface AppUser {
    uid: string;
    email: string;
    role: Role;
    resId?: string; // cashier and chef tokens are tied to one restaurant
    resSlug?: string;
}

declare module "express-serve-static-core" {
    interface Request {
        user?: AppUser;
    }
}

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);
const ISSUER = "v-menu";

export async function signAppToken(user: AppUser, ttl = "1h") {
    return new SignJWT({ ...user })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(secret());
}

function readToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    const cookie = req.headers.cookie
        ?.split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("token="));
    return cookie ? decodeURIComponent(cookie.slice(6)) : null;
}

// Checks the signature and expiry, then the role. Restaurant-level checks happen in the routes.
export function requireRole(...roles: Role[]) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        const token = readToken(req);
        if (!token) return next(unauthorized());
        try {
            const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, algorithms: ["HS256"] });
            const user = payload as unknown as AppUser;
            if (!roles.includes(user.role)) return next(forbidden("Wrong role for this action"));
            req.user = user;
            next();
        } catch {
            next(unauthorized("Invalid or expired token"));
        }
    };
}

// The rule every service applies once it knows which restaurant a request is about.
export function assertRestaurantAccess(user: AppUser, restaurant: { _id: string; ownerId: string }) {
    const ok = user.role === "owner" ? restaurant.ownerId === user.uid : String(user.resId) === String(restaurant._id);
    if (!ok) throw forbidden("No access to this restaurant");
}
