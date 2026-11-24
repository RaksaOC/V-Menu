import { prom, registry } from "@vmenu/common";
import { ORDER_STATUSES, type OrderStatus } from "@vmenu/contracts";

// B10: the kitchen's numbers, on this service's /metrics. The monitoring agent collects them every
// minute (infra/monitoring/config.alloy keeps vmenu_*); the Kitchen row on the Overview dashboard
// and the "Order pending too long" alert read them.

/** Orders entering each status: pending when placed, then each kitchen step, or cancelled. */
const ordersTotal = new prom.Counter({
    name: "vmenu_orders_total",
    help: "Orders that entered each status (pending when placed, then preparing, ready, served or cancelled)",
    labelNames: ["status"],
    registers: [registry],
});

// Every status starts at 0: Prometheus' increase() can't see a series' first value, so without
// this the first order after each restart would be missing from the dashboard.
for (const status of ORDER_STATUSES) ordersTotal.inc({ status }, 0);

/** VM-27: from the customer's order to "ready", in seconds. */
const readySeconds = new prom.Histogram({
    name: "vmenu_order_ready_seconds",
    help: "Seconds from an order being placed to the kitchen marking it ready",
    buckets: [60, 120, 300, 600, 900, 1200, 1800, 2700, 3600],
    registers: [registry],
});

/** VM-22: orders refused by the order rate limits. Both limiters' 429 handlers call countRateLimitedOrder(). */
const rateLimited = new prom.Counter({
    name: "vmenu_orders_rate_limited_total",
    help: "Orders refused by the order rate limits, per client or per table (VM-22)",
    registers: [registry],
});

/** An order pending for longer than this was forgotten (a test order, a closed shift). It stops
 *  counting, so one such order can't keep the alert on for ever and hide a real one. */
const PENDING_WINDOW_MS = 24 * 60 * 60_000;

/** Where the gauge below reads the oldest pending order's time. Set by createApp. */
let oldestPending: (since: Date) => Promise<Date | null> = async () => null;

/** Read when /metrics is scraped: how long the oldest pending order of the last day has waited (0 when none). */
new prom.Gauge({
    name: "vmenu_orders_pending_oldest_seconds",
    help: "Seconds the oldest order still pending (placed in the last 24 hours) has waited, 0 when none is",
    registers: [registry],
    async collect() {
        const at = await oldestPending(new Date(Date.now() - PENDING_WINDOW_MS)).catch(() => null); // a slow or down database must not break /metrics
        this.set(at ? Math.max(0, (Date.now() - at.getTime()) / 1000) : 0);
    },
});

export function countOrderStatus(status: OrderStatus) {
    ordersTotal.inc({ status });
}

export function observeReady(orderedAt: Date, now = new Date()) {
    readySeconds.observe(Math.max(0, (now.getTime() - orderedAt.getTime()) / 1000));
}

export function countRateLimitedOrder() {
    rateLimited.inc();
}

export function watchPendingOrders(source: (since: Date) => Promise<Date | null>) {
    oldestPending = source;
}
