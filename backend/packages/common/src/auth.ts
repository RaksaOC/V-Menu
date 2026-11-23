import type { NextFunction, Request, Response } from "express";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
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

// SEC-01: browsers carry the session in the httpOnly "token" cookie, which page scripts can't
// read. A Bearer header is accepted only when AUTH_ALLOW_BEARER=true (tests and internal tools);
// a browser never sends one.
export const bearerAllowed = () => process.env.AUTH_ALLOW_BEARER === "true";

function readToken(req: Request): string | null {
    const cookie = req.headers.cookie
        ?.split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("token="));
    if (cookie) return decodeURIComponent(cookie.slice(6));
    const header = req.headers.authorization;
    if (bearerAllowed() && header?.startsWith("Bearer ")) return header.slice(7);
    return null;
}

// Checks the signature and expiry, then the role. Restaurant-level checks happen in the routes.
export function requireRole(...roles: Role[]) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        const token = readToken(req);
        if (!token) return next(unauthorized(undefined, "no_token"));
        try {
            const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, algorithms: ["HS256"] });
            const user = payload as unknown as AppUser;
            if (!roles.includes(user.role)) return next(forbidden("Wrong role for this action", "wrong_role", user));
            req.user = user;
            next();
        } catch (err) {
            next(unauthorized("Invalid or expired token", err instanceof joseErrors.JWTExpired ? "expired" : "bad_token"));
        }
    };
}

// The rule every service applies once it knows which restaurant a request is about.
export function assertRestaurantAccess(user: AppUser, restaurant: { _id: string; ownerId: string }) {
    const ok = user.role === "owner" ? restaurant.ownerId === user.uid : String(user.resId) === String(restaurant._id);
    if (!ok) throw forbidden("No access to this restaurant", "other_restaurant", user);
}
