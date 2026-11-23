import { baseApp, finish } from "@vmenu/common";
import type { VerifyIdToken } from "./clients/firebase.js";
import { mongoRestaurantsRepo, type RestaurantsRepo } from "./repositories/restaurants.repo.js";
import { mongoTenantsRepo, type TenantsRepo } from "./repositories/tenants.repo.js";
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
    tenants?: TenantsRepo;
}

/** Builds the Express app: wires the repositories and Firebase into the services, and mounts the routers (CL-04). */
export function createApp({ verifyIdToken, restaurants = mongoRestaurantsRepo, tenants = mongoTenantsRepo }: Deps) {
    const places = restaurantsService({ restaurants, tenants });
    const ctx: RouteContext = {
        services: {
            restaurants: places,
            auth: authService({ restaurants, tenants, verifyIdToken, places }),
            staff: staffService({ restaurants, tenants }),
        },
    };

    const app = baseApp();
    app.use("/api/auth", authRoutes(ctx));
    app.use("/api", ownerRoutes(ctx));
    app.use("/internal", internalRoutes(ctx));
    return finish(app);
}
