import { randomUUID } from "node:crypto";
import pino from "pino";
import { pinoHttp } from "pino-http";

// One JSON line per log entry on stdout, so Docker (and later Loki) can collect them.
export const logger = pino({
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
    base: { service: process.env.SERVICE_NAME ?? "service" },
    redact: ["req.headers.authorization", "req.headers.cookie", "req.headers['x-internal-key']", 'res.headers["set-cookie"]'],
});

// Every request gets an id (taken from the gateway's X-Request-Id when present) that is
// logged and passed on to other services, so one order can be followed across all three.
export const httpLogger = pinoHttp({
    logger,
    genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && incoming.length <= 64 ? incoming : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
    },
    autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" || req.url === "/metrics" },
});
