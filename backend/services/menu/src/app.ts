import { baseApp, finish, lookupRestaurant as defaultLookup, type LookupRestaurant } from "@vmenu/common";
import { mongoImagesRepo, type ImagesRepo } from "./repositories/images.repo.js";
import { mongoItemsRepo, type ItemsRepo } from "./repositories/items.repo.js";
import { mongoTablesRepo, type TablesRepo } from "./repositories/tables.repo.js";
import { imagesService } from "./services/images.service.js";
import { internalService } from "./services/internal.service.js";
import { itemsService } from "./services/items.service.js";
import { tablesService } from "./services/tables.service.js";
import { restaurantFrom, type RouteContext } from "./routes/context.js";
import { imagesRoutes } from "./routes/images.routes.js";
import { internalRoutes } from "./routes/internal.routes.js";
import { itemsRoutes } from "./routes/items.routes.js";
import { publicRoutes } from "./routes/public.routes.js";
import { tablesRoutes } from "./routes/tables.routes.js";

interface Deps {
    lookupRestaurant?: LookupRestaurant;
    uploadsPerHour?: number;
    items?: ItemsRepo;
    tables?: TablesRepo;
    images?: ImagesRepo;
}

/** Builds the Express app: wires the repositories into the services, and mounts the routers (CL-04). */
export function createApp({
    lookupRestaurant = defaultLookup,
    uploadsPerHour = Number(process.env.UPLOADS_PER_HOUR ?? 30),
    items = mongoItemsRepo,
    tables = mongoTablesRepo,
    images = mongoImagesRepo,
}: Deps = {}) {
    const ctx: RouteContext = {
        services: {
            items: itemsService({ items, images }),
            tables: tablesService({ tables }),
            images: imagesService({ images }),
            internal: internalService({ items, tables }),
        },
        ...restaurantFrom(lookupRestaurant),
    };

    const app = baseApp();
    app.use("/api/menu/:slug", publicRoutes(ctx), itemsRoutes(ctx), imagesRoutes(ctx, { uploadsPerHour }), tablesRoutes(ctx));
    app.use("/internal", internalRoutes(ctx));
    return finish(app);
}
