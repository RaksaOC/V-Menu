import type { authService } from "../services/auth.service.js";
import type { restaurantsService } from "../services/restaurants.service.js";
import type { staffService } from "../services/staff.service.js";

/** What every router needs: the services. */
export interface RouteContext {
    services: {
        auth: ReturnType<typeof authService>;
        restaurants: ReturnType<typeof restaurantsService>;
        staff: ReturnType<typeof staffService>;
    };
}
