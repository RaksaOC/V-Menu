import type { Request } from "express";
import { baseApp, finish, lookupRestaurant as defaultLookup, type LookupRestaurant } from "@vmenu/common";
import { bindClients, httpClients, type Clients } from "./clients/index.js";
import { mongoBillsRepo, type BillsRepo } from "./repositories/bills.repo.js";
import { mongoOrdersRepo, type OrdersRepo } from "./repositories/orders.repo.js";
import { billsService } from "./services/bills.service.js";
import { kitchenService } from "./services/kitchen.service.js";
import { ordersService } from "./services/orders.service.js";
import { statsService } from "./services/stats.service.js";
import { requestsService } from "./services/requests.service.js";
import { tableService } from "./services/table.service.js";
import { billsRoutes } from "./routes/bills.routes.js";
import { restaurantFrom, type RouteContext } from "./routes/context.js";
import { internalRoutes } from "./routes/internal.routes.js";
import { kitchenRoutes } from "./routes/kitchen.routes.js";
import { orderLimitsFromEnv, type OrderLimits } from "./routes/order-limits.js";
import { ordersRoutes } from "./routes/orders.routes.js";
import { overviewRoutes } from "./routes/overview.routes.js";
import { ownerRoutes } from "./routes/owner.routes.js";
import { tableRoutes } from "./routes/table.routes.js";

interface Deps {
    lookupRestaurant?: LookupRestaurant;
    clients?: Clients;
    orders?: OrdersRepo;
    bills?: BillsRepo;
    /** VM-22: from ORDERS_PER_MINUTE and ORDERS_PER_TABLE unless a test sets them */
    orderLimits?: OrderLimits;
}

/** Builds the Express app: wires repositories and clients into the services, and mounts the routers. */
export function createApp({
    lookupRestaurant = defaultLookup,
    clients = httpClients,
    orders = mongoOrdersRepo,
    bills = mongoBillsRepo,
    orderLimits = orderLimitsFromEnv(),
}: Deps = {}) {
    const ctx: RouteContext = {
        services(req: Request) {
            const bound = bindClients(clients, req);
            return {
                orders: ordersService({ orders, bills, clients: bound }),
                kitchen: kitchenService({ orders }),
                bills: billsService({ bills, orders }),
                stats: statsService({ orders, bills, clients: bound }),
                table: tableService({ orders, bills }),
                requests: requestsService({ bills }),
            };
        },
        restaurant: restaurantFrom(lookupRestaurant),
    };

    const app = baseApp();
    app.use("/internal", internalRoutes(ctx));
    // Mounted before "/:slug" so "owner" is never read as a restaurant slug.
    app.use("/api/orders/owner", ownerRoutes(ctx));
    app.use("/api/orders/:slug/kitchen", kitchenRoutes(ctx));
    app.use("/api/orders/:slug/bills", billsRoutes(ctx));
    app.use("/api/orders/:slug/overview", overviewRoutes(ctx));
    app.use("/api/orders/:slug/tables/:table", tableRoutes(ctx));
    app.use("/api/orders/:slug", ordersRoutes(ctx, orderLimits));
    return finish(app);
}
