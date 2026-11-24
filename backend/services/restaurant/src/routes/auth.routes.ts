import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { rateLimitHandler, requireRole } from "@vmenu/common";
import { sessionHours } from "../services/session.js";
import type { RouteContext } from "./context.js";

/** The session cookie: httpOnly, so page scripts never see the token (SEC-01). Lasts a shift (VM-03). */
function cookieOptions(hours = sessionHours()) {
    return {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE !== "false",
        sameSite: "lax" as const,
        path: "/",
        maxAge: hours * 3600 * 1000,
    };
}

/** /api/auth: sign-up and sign-in with a Firebase ID token, and sign-out. */
export function authRoutes({ services }: RouteContext) {
    const r = Router();
    // VM-20: read on every dashboard load, so it's outside the sign-in rate limit; it needs a session
    r.get("/me", requireRole("owner", "cashier", "chef"), async (req, res) => {
        res.json(await services.auth.me(req.user!));
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
        res.cookie("token", token, cookieOptions(hours)).json({ role });
    });
    r.post("/logout", (_req, res) => {
        res.clearCookie("token", { ...cookieOptions(), maxAge: undefined }).json({ message: "Signed out" });
    });
    // SEC-03: ends this account's sessions on every device, then this browser's cookie
    r.post("/sign-out-everywhere", requireRole("owner", "cashier", "chef"), async (req, res) => {
        await services.auth.signOutEverywhere(req.user!.uid);
        res.clearCookie("token", { ...cookieOptions(), maxAge: undefined }).json({ message: "Signed out everywhere" });
    });
    return r;
}
