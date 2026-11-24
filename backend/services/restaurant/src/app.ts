import { baseApp, finish, setSessionLookup, type SessionLookup } from "@vmenu/common";
import type { VerifyIdToken } from "./clients/firebase.js";
import { mongoRestaurantsRepo, type RestaurantsRepo } from "./repositories/restaurants.repo.js";
import { mongoMembershipsRepo, type MembershipsRepo } from "./repositories/memberships.repo.js";
import { authService } from "./services/auth.service.js";
import { restaurantsService } from "./services/restaurants.service.js";
import { staffService } from "./services/staff.service.js";
import { authRoutes } from "./routes/auth.routes.js";
import type { RouteContext } from "./routes/context.js";
import { internalRoutes } from "./routes/internal.routes.js";
import { ownerRoutes } from "./routes/owner.routes.js";
import { publicRoutes } from "./routes/public.routes.js";
import { settingsRoutes } from "./routes/settings.routes.js";

interface Deps {
    verifyIdToken: VerifyIdToken;
    restaurants?: RestaurantsRepo;
    memberships?: MembershipsRepo;
    /** SEC-03: how this service checks a session; by default straight from its own data */
    sessionLookup?: SessionLookup;
}

/** Builds the Express app: wires the repositories and Firebase into the services, and mounts the routers (CL-04). */
export function createApp({ verifyIdToken, restaurants = mongoRestaurantsRepo, memberships = mongoMembershipsRepo, sessionLookup }: Deps) {
    const places = restaurantsService({ restaurants, memberships });
    const ctx: RouteContext = {
        services: {
            restaurants: places,
            auth: authService({ restaurants, memberships, verifyIdToken, places }),
            staff: staffService({ restaurants, memberships }),
        },
    };

    // SEC-03: this service holds the memberships, so it reads them directly, with no cache
    const ownData: SessionLookup = async (_req, { uid, role, resId }) =>
        (await ctx.services.auth.sessionVersion({ uid, role, resId })).version;
    setSessionLookup(sessionLookup ?? ownData, { cache: false });

    const app = baseApp();
    app.use("/api/auth", authRoutes(ctx));
    // before the owner routes, which need a sign-in
    app.use("/api", publicRoutes(ctx)); // VM-21: the restaurant's name
    app.use("/api", settingsRoutes(ctx)); // VM-24: how it shows prices
    app.use("/api", ownerRoutes(ctx));
    app.use("/internal", internalRoutes(ctx));
    return finish(app);
}
