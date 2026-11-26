import { baseApp, finish, lookupRestaurant as defaultLookup, type LookupRestaurant } from "@vmenu/common";
import { httpOpenBills, type OpenBillsFor } from "./clients/open-bills.js";
import { mongoCategoriesRepo, type CategoriesRepo } from "./repositories/categories.repo.js";
import { mongoImagesRepo, type ImagesRepo } from "./repositories/images.repo.js";
import { mongoItemsRepo, type ItemsRepo } from "./repositories/items.repo.js";
import { minioPhotoStore, storageConfig, type PhotoStore } from "./repositories/photo-store.js";
import { mongoTablesRepo, type TablesRepo } from "./repositories/tables.repo.js";
import { categoriesService } from "./services/categories.service.js";
import { imagesService } from "./services/images.service.js";
import { internalService } from "./services/internal.service.js";
import { itemsService } from "./services/items.service.js";
import { tablesService } from "./services/tables.service.js";
import { restaurantFrom, type RouteContext } from "./routes/context.js";
import { categoriesRoutes } from "./routes/categories.routes.js";
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
    /** photos from before PHOTOS-S3, in GridFS */
    images?: ImagesRepo;
    /** PHOTOS-S3: object storage (MinIO), from the S3_* settings */
    photos?: PhotoStore;
    categories?: CategoriesRepo;
    /** VM-15: order-service, asked before a table is renamed or deleted */
    openBills?: OpenBillsFor;
}

/** Builds the Express app: wires the repositories into the services, and mounts the routers (CL-04). */
export function createApp({
    lookupRestaurant = defaultLookup,
    uploadsPerHour = Number(process.env.UPLOADS_PER_HOUR ?? 30),
    items = mongoItemsRepo,
    tables = mongoTablesRepo,
    images = mongoImagesRepo,
    photos = minioPhotoStore(storageConfig()),
    categories = mongoCategoriesRepo,
    openBills = httpOpenBills,
}: Deps = {}) {
    const photoFiles = imagesService({ images, photos });
    const ctx: RouteContext = {
        services: {
            items: itemsService({ items, photos: photoFiles, categories }),
            categories: categoriesService({ categories, items }),
            tables: tablesService({ tables }),
            images: photoFiles,
            internal: internalService({ items, tables }),
        },
        ...restaurantFrom(lookupRestaurant),
        openBills,
    };

    const app = baseApp({ ready: { storage: photoFiles.isUp } }); // PHOTOS-S3: not ready without object storage
    app.use(
        "/api/menu/:slug",
        publicRoutes(ctx),
        itemsRoutes(ctx),
        imagesRoutes(ctx, { uploadsPerHour }),
        tablesRoutes(ctx),
        categoriesRoutes(ctx),
    );
    app.use("/internal", internalRoutes(ctx));
    return finish(app);
}
