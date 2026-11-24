import type { NextFunction, Request, Response } from "express";
import client from "prom-client";

// Prometheus metrics: process CPU/memory plus request count and latency per route.
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.path === "/metrics") return next();
    const end = httpDuration.startTimer();
    res.on("finish", () => {
        // Label with the route pattern (/api/menu/:slug/items), not the real URL, so each
        // restaurant or id does not create its own time series.
        const base = req.baseUrl
            .replace(/^(\/api\/(?:menu|orders|restaurants))\/(?!owner$)[^/]+/, "$1/:slug")
            .replace(/\/[0-9a-f]{24}(?=\/|$)/g, "/:id");
        const route = req.route?.path ? `${base}${req.route.path}` : "unmatched";
        end({ method: req.method, route, status: String(res.statusCode) });
    });
    next();
}

export async function metricsHandler(_req: Request, res: Response) {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
}
