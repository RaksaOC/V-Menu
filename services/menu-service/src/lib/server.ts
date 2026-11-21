import express, { type Express } from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { errorHandler, notFound } from "./errors.js";
import { httpLogger } from "./logger.js";
import { metricsHandler, metricsMiddleware } from "./metrics.js";

// Strip $-operators from query filters, so a body like {"email": {"$ne": null}} cannot
// turn into a NoSQL injection.
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

// The parts every service shares: security headers, JSON body, logs, metrics and health.
export function baseApp(): Express {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", 1); // behind the nginx gateway
    app.use(helmet());
    app.use(express.json({ limit: "100kb" }));
    app.use(httpLogger);
    app.use(metricsMiddleware);
    app.get("/health", (_req, res) => {
        const db = mongoose.connection.readyState === 1;
        res.status(db ? 200 : 503).json({ status: db ? "ok" : "degraded", service: process.env.SERVICE_NAME, db });
    });
    // Which build is running: GIT_SHA is baked into the Docker image at build time.
    app.get("/version", (_req, res) => {
        res.json({ service: process.env.SERVICE_NAME, version: process.env.GIT_SHA ?? "dev" });
    });
    app.get("/metrics", metricsHandler);
    return app;
}

export function finish(app: Express) {
    app.use((_req, _res, next) => next(notFound("Route not found")));
    app.use(errorHandler);
    return app;
}
