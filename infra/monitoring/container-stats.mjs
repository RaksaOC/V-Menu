// Prometheus metrics for the V-Menu containers, read through the docker-api filter.
//
// Used instead of cAdvisor, which needs the containerd socket on current Docker versions.
// That socket is root access to the host, and a filter cannot make it read-only.
import { lookup } from "node:dns/promises";
import { statfs } from "node:fs/promises";
import http from "node:http";

const DOCKER_API = process.env.DOCKER_API ?? "http://docker-api:2375";
const PORT = 9417;
const PROJECT = /^vmenu-(staging|prod|local)$/;

const METRICS = [
    ["container_cpu_usage_seconds_total", "counter", "CPU time used by the container"],
    ["container_memory_working_set_bytes", "gauge", "Memory in use, without reclaimable file cache"],
    ["container_spec_memory_limit_bytes", "gauge", "Memory limit of the container"],
    ["container_network_receive_bytes_total", "counter", "Bytes received"],
    ["container_network_transmit_bytes_total", "counter", "Bytes sent"],
];

// Docker's built-in DNS answers from inside dockerd, which can take seconds on a busy server.
// Every new connection would look the name up again, so resolve it once and reuse the address
// until a request fails.
const apiUrl = new URL(DOCKER_API);
let apiBase = null;

async function base() {
    if (!apiBase) {
        const { address } = await lookup(apiUrl.hostname, { family: 4 });
        apiBase = `${apiUrl.protocol}//${address}:${apiUrl.port || 80}`;
    }
    return apiBase;
}

async function docker(path) {
    try {
        const res = await fetch((await base()) + path, { signal: AbortSignal.timeout(20000) });
        if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        apiBase = null; // the filter may have been recreated with a new address
        throw err;
    }
}

const label = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

function values(stats) {
    const memory = stats.memory_stats ?? {};
    // cgroup v2 calls it inactive_file, cgroup v1 total_inactive_file.
    const cache = memory.stats?.inactive_file ?? memory.stats?.total_inactive_file ?? 0;
    const networks = Object.values(stats.networks ?? {});
    return [
        (stats.cpu_stats?.cpu_usage?.total_usage ?? 0) / 1e9,
        Math.max((memory.usage ?? 0) - cache, 0),
        memory.limit ?? 0,
        networks.reduce((sum, n) => sum + n.rx_bytes, 0),
        networks.reduce((sum, n) => sum + n.tx_bytes, 0),
    ];
}

async function render() {
    const containers = (await docker("/containers/json")).filter((c) => PROJECT.test(c.Labels?.["com.docker.compose.project"] ?? ""));
    const rows = await Promise.all(
        containers.map(async (c) => {
            try {
                const stats = await docker(`/containers/${c.Id}/stats?stream=false&one-shot=true`);
                const env = c.Labels["com.docker.compose.project"].replace("vmenu-", "");
                return { labels: `env="${label(env)}",service="${label(c.Labels["com.docker.compose.service"])}"`, values: values(stats) };
            } catch {
                return null; // stopped between the list and the stats call, e.g. during a deploy
            }
        }),
    );

    const lines = [];
    METRICS.forEach(([name, type, help], i) => {
        lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`);
        for (const row of rows) if (row) lines.push(`${name}{${row.labels}} ${row.values[i]}`);
    });

    // A container's "/" sits on the disk that holds Docker's images and logs.
    const disk = await statfs("/");
    lines.push(
        "# HELP vmenu_docker_disk_size_bytes Size of the disk that holds Docker's data",
        "# TYPE vmenu_docker_disk_size_bytes gauge",
        `vmenu_docker_disk_size_bytes ${disk.blocks * disk.bsize}`,
        "# HELP vmenu_docker_disk_avail_bytes Free space on the disk that holds Docker's data",
        "# TYPE vmenu_docker_disk_avail_bytes gauge",
        `vmenu_docker_disk_avail_bytes ${disk.bavail * disk.bsize}`,
    );
    return lines.join("\n") + "\n";
}

const server = http.createServer(async (req, res) => {
    if (req.url === "/health") return res.end("ok");
    if (req.url !== "/metrics") return res.writeHead(404).end();
    try {
        const body = await render();
        res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" }).end(body);
    } catch (err) {
        console.error(`scrape failed: ${err.message}`);
        res.writeHead(503).end("docker api unavailable\n");
    }
});

server.listen(PORT);
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
