import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";
import { assertRestaurantAccess, requireRole, signAppToken, type Role, assertId, badRequest, HttpError, notFound, unauthorized, requireInternal, baseApp, finish } from "@vmenu/common";
import type { VerifyIdToken } from "./firebase.js";
import { createRestaurantForOwner, Restaurant, Tenant } from "./models.js";

const STAFF_ROLES = ["cashier", "chef"] as const;
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

// VM-03: a sign-in lasts a whole shift (12 hours unless SESSION_HOURS says otherwise, 1 to 24),
// so a kitchen screen doesn't silently stop after an hour. The cookie lasts exactly as long.
function sessionHours(): number {
    const h = Number(process.env.SESSION_HOURS ?? 12);
    return Number.isFinite(h) && h >= 1 && h <= 24 ? h : 12;
}

function cookieOptions() {
    return { httpOnly: true, secure: process.env.COOKIE_SECURE !== "false", sameSite: "lax" as const, path: "/", maxAge: sessionHours() * 3600 * 1000 };
}

async function restaurantBySlug(slug: string) {
    const restaurant = await Restaurant.findOne({ slug }).lean();
    if (!restaurant) throw notFound("Restaurant not found");
    return { ...restaurant, _id: String(restaurant._id) };
}

export function createApp({ verifyIdToken }: { verifyIdToken: VerifyIdToken }) {
    const app = baseApp();

    // The browser signs in with Firebase, then sends the Firebase ID token here.
    async function identity(req: Request) {
        const idToken = str(req.body?.idToken, 4096);
        if (!idToken) throw unauthorized("Missing Firebase ID token");
        try {
            return await verifyIdToken(idToken);
        } catch {
            throw unauthorized("Firebase sign-in could not be verified");
        }
    }

    // ---------------- sign-up and sign-in ----------------
    const auth = Router();
    auth.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));

    // New owner: creates the restaurant and gives the owner all three roles.
    auth.post("/signup", async (req, res) => {
        const who = await identity(req);
        const ownerName = str(req.body.ownerName, 120);
        const resName = str(req.body.resName, 120);
        if (!ownerName || !resName) throw badRequest("Owner name and restaurant name are required");
        if (await Tenant.exists({ tenantId: who.uid, role: "owner" })) throw new HttpError(409, "This account already has a restaurant");
        const restaurant = await createRestaurantForOwner(resName, { uid: who.uid, email: who.email, name: ownerName });
        res.status(201).json({ message: "Account created", slug: restaurant.slug });
    });

    // Which restaurants and roles this person has: { "Name - slug": ["owner", "cashier"] }
    auth.post("/memberships", async (req, res) => {
        const who = await identity(req);
        const tenants = await Tenant.find({ $or: [{ tenantId: who.uid }, { email: who.email }] }).lean();
        const restaurants = await Restaurant.find({ _id: mongoose.trusted({ $in: [...new Set(tenants.map((t) => t.resId))] }) }).lean();
        const byId = new Map(restaurants.map((r) => [String(r._id), r]));
        const map: Record<string, string[]> = {};
        for (const t of tenants) {
            const r = byId.get(t.resId);
            if (!r) continue;
            const key = `${r.name} - ${r.slug}`;
            map[key] ??= [];
            if (!map[key].includes(t.role)) map[key].push(t.role);
        }
        res.json(map);
    });

    // Swaps a verified Firebase sign-in for an app token with one role (and, for staff, one restaurant).
    auth.post("/login", async (req, res) => {
        const who = await identity(req);
        const role = req.body.role as Role;
        if (!["owner", "cashier", "chef"].includes(role)) throw badRequest("Unknown role");
        let token: string;
        if (role === "owner") {
            const isOwner = await Tenant.exists({ tenantId: who.uid, role: "owner" });
            if (!isOwner) throw unauthorized("This account is not a restaurant owner");
            token = await signAppToken({ uid: who.uid, email: who.email, role }, `${sessionHours()}h`);
        } else {
            const slug = str(req.body.resSlug, 120);
            if (!slug) throw badRequest("Restaurant is required");
            const restaurant = await restaurantBySlug(slug);
            const member = await Tenant.exists({ resId: restaurant._id, role, $or: [{ tenantId: who.uid }, { email: who.email }] });
            if (!member) throw unauthorized("You do not have this role at this restaurant");
            token = await signAppToken({ uid: who.uid, email: who.email, role, resId: restaurant._id, resSlug: restaurant.slug }, `${sessionHours()}h`);
        }
        res.cookie("token", token, cookieOptions()).json({ appToken: token });
    });

    auth.post("/logout", (_req, res) => {
        res.clearCookie("token", { ...cookieOptions(), maxAge: undefined }).json({ message: "Signed out" });
    });
    app.use("/api/auth", auth);

    // ---------------- owner: restaurants and staff ----------------
    const owner = Router();
    owner.use(requireRole("owner"));

    owner.get("/restaurants", async (req, res) => {
        res.json(await Restaurant.find({ ownerId: req.user!.uid }).sort({ createdAt: 1 }).lean());
    });

    owner.post("/restaurants", async (req, res) => {
        const name = str(req.body?.name, 120);
        if (!name) throw badRequest("Restaurant name is required");
        const me = await Tenant.findOne({ tenantId: req.user!.uid }).lean();
        const restaurant = await createRestaurantForOwner(name, { uid: req.user!.uid, email: req.user!.email, name: me?.name ?? req.user!.email });
        res.status(201).json(restaurant);
    });

    // Every restaurant this owner has, with its staff: [{ resName, staff: [...] }]
    owner.get("/staff", async (req, res) => {
        const restaurants = await Restaurant.find({ ownerId: req.user!.uid }).sort({ createdAt: 1 }).lean();
        const staff = await Tenant.find({ resId: mongoose.trusted({ $in: restaurants.map((r) => String(r._id)) }) }).lean();
        res.json(restaurants.map((r) => ({ resName: r.name, staff: staff.filter((s) => s.resId === String(r._id)) })));
    });

    async function ownedRestaurant(req: Request) {
        const restaurant = await restaurantBySlug(String(req.params.slug));
        assertRestaurantAccess(req.user!, restaurant);
        return restaurant;
    }

    owner.get("/restaurants/:slug/staff", async (req, res) => {
        const restaurant = await ownedRestaurant(req);
        res.json(await Tenant.find({ resId: restaurant._id }).lean());
    });

    owner.post("/restaurants/:slug/staff", async (req, res) => {
        const restaurant = await ownedRestaurant(req);
        const name = str(req.body.name, 120);
        const email = str(req.body.email, 200)?.toLowerCase();
        const tenantId = str(req.body.tenantId, 128);
        const role = req.body.role;
        if (!name || !email || !tenantId || !STAFF_ROLES.includes(role)) throw badRequest("Name, email, account id and a cashier or chef role are required");
        if (await Tenant.exists({ resId: restaurant._id, role, $or: [{ tenantId }, { email }] })) throw new HttpError(409, "This person already has that role here");
        res.status(201).json(await Tenant.create({ name, email, tenantId, role, resId: restaurant._id }));
    });

    async function staffMember(req: Request) {
        const restaurant = await ownedRestaurant(req);
        assertId(String(req.params.id), "staff id");
        const member = await Tenant.findOne({ _id: req.params.id, resId: restaurant._id });
        if (!member) throw notFound("Staff member not found");
        if (member.role === "owner") throw badRequest("The owner role cannot be changed here");
        return member;
    }

    owner.put("/restaurants/:slug/staff/:id", async (req, res) => {
        const member = await staffMember(req);
        const name = str(req.body.name, 120);
        const email = str(req.body.email, 200)?.toLowerCase();
        if (name) member.name = name;
        if (email) member.email = email;
        if (req.body.role !== undefined) {
            if (!STAFF_ROLES.includes(req.body.role)) throw badRequest("Role must be cashier or chef");
            member.role = req.body.role;
        }
        res.json(await member.save());
    });

    owner.delete("/restaurants/:slug/staff/:id", async (req, res) => {
        const member = await staffMember(req);
        await member.deleteOne();
        res.json(member);
    });
    app.use("/api", owner);

    // ---------------- internal: other services resolve restaurants here ----------------
    const internal = Router();
    internal.use(requireInternal);
    internal.get("/restaurants/by-slug/:slug", async (req: Request, res: Response) => {
        const r = await restaurantBySlug(String(req.params.slug));
        res.json({ _id: r._id, name: r.name, slug: r.slug, ownerId: r.ownerId });
    });
    internal.get("/restaurants", async (req, res) => {
        const ownerId = str(req.query.ownerId, 128);
        if (!ownerId) throw badRequest("ownerId is required");
        const list = await Restaurant.find({ ownerId }).sort({ createdAt: 1 }).lean();
        res.json(list.map((r) => ({ _id: String(r._id), name: r.name, slug: r.slug, ownerId: r.ownerId })));
    });
    app.use("/internal", internal);

    return finish(app);
}
