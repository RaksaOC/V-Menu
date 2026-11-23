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

interface Deps {
    verifyIdToken: VerifyIdToken;
    restaurants?: RestaurantsRepo;
    memberships?: MembershipsRepo;
    /** SEC-03: how this service checks a session; by default straight from its own data */
    sessionLookup?: SessionLookup;
}

/** Builds the Express app: wires the repositories and Firebase into the services, and mounts the routers (CL-04). */
export function createApp({ verifyIdToken, restaurants = mongoRestaurantsRepo, memberships = mongoMembershipsRepo, sessionLookup }: Deps) {
    setSessionLookup(
        sessionLookup ?? ((_req, user) => memberships.sessionVersion(user.uid, user.role, user.role === "owner" ? undefined : user.resId)),
        {
            cache: false,
        },
    );
    const places = restaurantsService({ restaurants, memberships });
    const ctx: RouteContext = {
        services: {
            restaurants: places,
            auth: authService({ restaurants, memberships, verifyIdToken, places }),
            staff: staffService({ restaurants, memberships }),
        },
    };

    const app = baseApp();
    app.use("/api/auth", authRoutes(ctx));
    app.use("/api", ownerRoutes(ctx));
    app.use("/internal", internalRoutes(ctx));
    return finish(app);
}
