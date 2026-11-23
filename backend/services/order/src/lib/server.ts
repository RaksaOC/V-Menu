import express, { type Express } from "express";
import type { Server } from "node:http";
import helmet from "helmet";
import mongoose from "mongoose";
import { errorHandler, notFound } from "./errors.js";
import { httpLogger, logger } from "./logger.js";
import { metricsHandler, metricsMiddleware } from "./metrics.js";

// Strip $-operators from query filters, so a body like {"email": {"$ne": null}} cannot
// turn into a NoSQL injection.
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

let shuttingDown = false;
const dbConnected = () => mongoose.connection.readyState === 1;

/** Marks the service as draining: /ready answers 503 from now on. */
export function markShuttingDown() {
    shuttingDown = true;
}

// The parts every service shares: security headers, JSON body, logs, metrics, liveness and readiness.
export function baseApp(): Express {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", 1); // behind the nginx gateway
    app.use(helmet());
    app.use(express.json({ limit: "100kb" }));
    app.use(httpLogger);
    app.use(metricsMiddleware);
    // Liveness: the process is up and answering. Docker/k8s restart it only when this fails.
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", service: process.env.SERVICE_NAME, db: dbConnected() });
    });
    // Readiness: safe to send traffic. False until MongoDB is connected and again while
    // shutting down, so health checks and proxies stop routing here before the process exits.
    app.get("/ready", (_req, res) => {
        const db = dbConnected();
        const ready = db && !shuttingDown;
        res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "not ready", service: process.env.SERVICE_NAME, db, shuttingDown });
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

/**
 * Graceful shutdown on SIGTERM (docker stop / compose up replacing the container) and SIGINT:
 * stop being ready, stop accepting connections, let in-flight requests finish, close MongoDB,
 * exit. If draining takes longer than timeoutMs (Docker kills after 10 s), exit anyway.
 */
export function handleShutdown(server: Server, timeoutMs = 8000) {
    let stopping = false;
    const stop = (signal: NodeJS.Signals) => {
        if (stopping) return;
        stopping = true;
        markShuttingDown();
        logger.info({ signal, timeoutMs }, "shutting down: draining open requests");
        const force = setTimeout(() => {
            logger.warn("drain timed out, exiting with requests still open");
            process.exit(1);
        }, timeoutMs);
        force.unref();
        server.close(async (err) => {
            try {
                await mongoose.disconnect();
            } catch (e) {
                logger.error({ err: e }, "error while closing MongoDB");
            }
            clearTimeout(force);
            logger.info("shutdown complete");
            process.exit(err ? 1 : 0);
        });
        server.closeIdleConnections(); // keep-alive sockets with no request in flight
    };
    process.on("SIGTERM", () => stop("SIGTERM"));
    process.on("SIGINT", () => stop("SIGINT"));
}
