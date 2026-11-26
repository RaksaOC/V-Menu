import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { rateLimitHandler, requireRole, ROLE_HEADER, ROLES, sessionCookieName, type Role } from "@vmenu/common";
import type { Response } from "express";
import { sessionHours } from "../services/session.js";
import type { RouteContext } from "./context.js";

const secure = () => process.env.COOKIE_SECURE !== "false";

/** A session cookie: httpOnly, so page scripts never see the token (SEC-01). Lasts a shift (VM-03). */
function cookieOptions(hours = sessionHours()) {
    return {
        httpOnly: true,
        secure: secure(),
        sameSite: "lax" as const,
        path: "/",
        maxAge: hours * 3600 * 1000,
    };
}

/** SEC-12: clears these roles' session cookies, and the old shared "token" cookie this site used to set. */
function clearSessions(res: Response, roles: readonly Role[]) {
    const options = { ...cookieOptions(), maxAge: undefined };
    for (const role of roles) res.clearCookie(sessionCookieName(role, secure()), options);
    res.clearCookie("token", options);
    return res;
}

/** The role a page signs out of, or all of them when it doesn't say. */
function rolesToEnd(asked: unknown): readonly Role[] {
    return typeof asked === "string" && (ROLES as string[]).includes(asked) ? [asked as Role] : ROLES;
}

/** /api/auth: sign-up and sign-in with a Firebase ID token, and sign-out. */
export function authRoutes({ services }: RouteContext) {
    const r = Router();
    // VM-20: read on every dashboard load, so it's outside the sign-in rate limit; it needs a session
    r.get("/me", requireRole("owner", "cashier", "chef"), async (req, res) => {
        res.json(await services.auth.me(req.user!));
    });
    // SEC-01: signing out comes before the sign-in rate limit, so it always works. Clearing a cookie
    // or ending sessions gives nobody access, so there's nothing for the limit to protect here.
    // SEC-12: a page signs out of its own role only, so the owner's other screens stay signed in
    r.post("/logout", (req, res) => {
        clearSessions(res, rolesToEnd(req.headers[ROLE_HEADER])).json({ message: "Signed out" });
    });
    // SEC-03: ends this account's sessions on every device, then this browser's cookie
    r.post("/sign-out-everywhere", requireRole("owner", "cashier", "chef"), async (req, res) => {
        await services.auth.signOutEverywhere(req.user!.uid);
        clearSessions(res, ROLES).json({ message: "Signed out everywhere" });
    });
    r.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler }));
    r.post("/signup", async (req, res) => {
        res.status(201).json(await services.auth.signup(req.body));
    });
    r.post("/memberships", async (req, res) => {
        res.json(await services.auth.memberships(req.body));
    });
    r.post("/login", async (req, res) => {
        const { token, role, hours } = await services.auth.login(req.body);
        res.cookie(sessionCookieName(role, secure()), token, cookieOptions(hours));
        res.clearCookie("token", { ...cookieOptions(), maxAge: undefined }); // SEC-12: the old shared cookie
        res.json({ role });
    });
    return r;
}
