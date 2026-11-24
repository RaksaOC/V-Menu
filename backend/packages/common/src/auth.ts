import type { NextFunction, Request, Response } from "express";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import { HttpError, forbidden, unauthorized } from "./errors.js";
import { callService } from "./internal.js";

export type Role = "owner" | "cashier" | "chef";

// What every service knows about the caller, read from the app token restaurant-service signs.
export interface AppUser {
    uid: string;
    email: string;
    role: Role;
    resId?: string; // cashier and chef tokens are tied to one restaurant
    resSlug?: string;
    tv?: number; // SEC-03: the session version when this token was issued; none means 0
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

/** SEC-03: this person's current session version for this role (and restaurant); null if they no longer have it. */
export type SessionLookup = (req: Request, user: AppUser) => Promise<number | null>;

/** The other services ask restaurant-service, which holds the memberships. */
const askRestaurantService: SessionLookup = async (req, { uid, role, resId }) => {
    const query = new URLSearchParams({ uid, role, ...(resId ? { resId } : {}) });
    const { version } = await callService<{ version: number | null }>(
        process.env.RESTAURANT_SERVICE_URL!,
        `/internal/sessions/version?${query}`,
        req,
    );
    return version;
};

// Versions are kept briefly because every staff request needs one. With this TTL, a removal or role
// change reaches every service within 30 seconds. "No longer has the role" isn't kept, so someone
// added back gets in straight away.
const SESSION_TTL = 20_000;
const SESSION_CACHE_MAX = 10_000;
const sessions = new Map<string, { at: number; version: number }>();
let lookupSession: SessionLookup = askRestaurantService;
let cacheSessions = true;

/** Sets how sessions are checked. restaurant-service reads its own data, without the cache. */
export function setSessionLookup(lookup: SessionLookup = askRestaurantService, { cache = true } = {}) {
    lookupSession = lookup;
    cacheSessions = cache;
    sessions.clear();
}

async function currentVersion(req: Request, user: AppUser) {
    if (!cacheSessions) return lookupSession(req, user);
    const key = JSON.stringify([user.uid, user.role, user.resId ?? ""]);
    const hit = sessions.get(key);
    // a token newer than the kept version means the kept one is out of date: they just signed in again
    if (hit && Date.now() - hit.at < SESSION_TTL && (user.tv ?? 0) <= hit.version) return hit.version;
    const version = await lookupSession(req, user);
    if (version === null) {
        sessions.delete(key);
        return null;
    }
    if (sessions.size >= SESSION_CACHE_MAX) sessions.clear();
    sessions.set(key, { at: Date.now(), version });
    return version;
}

// Checks the signature and expiry, the role, then that the session hasn't been ended (SEC-03).
// Restaurant-level checks happen in the routes.
export function requireRole(...roles: Role[]) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        const token = readToken(req);
        if (!token) return next(unauthorized(undefined, "no_token"));
        let user: AppUser;
        try {
            const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, algorithms: ["HS256"] });
            user = payload as unknown as AppUser;
        } catch (err) {
            // SEC-10: why, for the logs and metrics
            return next(unauthorized("Invalid or expired token", err instanceof joseErrors.JWTExpired ? "expired" : "bad_token"));
        }
        if (!roles.includes(user.role)) return next(forbidden("Wrong role for this action", "wrong_role", user));
        let version: number | null;
        try {
            version = await currentVersion(req, user);
        } catch {
            // can't tell: refuse this request, but as an outage, so nobody is signed out by it
            return next(new HttpError(503, "A required service is unavailable"));
        }
        // SEC-03: the session was ended (signed out everywhere, removed, role changed); SEC-10 counts it as a bad token
        if (version === null || version !== (user.tv ?? 0)) return next(unauthorized("Your session has ended", "bad_token", user));
        req.user = user;
        next();
    };
}

// The rule every service applies once it knows which restaurant a request is about.
export function assertRestaurantAccess(user: AppUser, restaurant: { _id: string; ownerId: string }) {
    const ok = user.role === "owner" ? restaurant.ownerId === user.uid : String(user.resId) === String(restaurant._id);
    if (!ok) throw forbidden("No access to this restaurant", "other_restaurant", user);
}
