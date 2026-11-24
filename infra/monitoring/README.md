# V-Menu monitoring

One small agent on the server collects metrics and logs once a minute and sends them to Grafana Cloud. Prometheus, Loki and Grafana run in the cloud, so nothing heavy runs on the server.

```
server
├─ vmenu-staging and vmenu-prod containers
│    └─ /metrics, logs ───────────────┐
├─ deploy-history.log (one per env) ──┤
├─ host CPU, memory, network ─────────┼─► Alloy ─► Grafana Cloud
└─ Docker API ─► docker-api (read-only filter)    (metrics, logs, dashboards, alerts)
                   └─► container-stats ───┘
```

On the test laptop the agent and its helpers use about 130 MB of memory in total and about 1% of one CPU core.

## What is collected

| Data | Source | Used for |
|---|---|---|
| Requests, errors, latency, Node.js health | each service's `/metrics` | Overview dashboard, alerts |
| Orders by status, time to ready, oldest pending order, refused orders, photo uploads (B10) | order-service and menu-service `/metrics` | Kitchen row on the Overview dashboard, alert |
| Refused requests (401, 403, 429) by service and reason (SEC-10) | every service's `/metrics` and logs | Security row on the Overview dashboard, alert |
| Container CPU, memory, network | Docker stats | Overview dashboard, alerts |
| Server CPU, memory, network, disk | `/proc`, `/sys`, Docker's disk | Overview dashboard, alerts |
| Service and frontend logs | Docker logs, with customer IPs removed | Overview dashboard |
| Deploys, rollbacks, results, failed post-deploy checks of staging | `deploy-history.log` | DORA dashboard, alerts |

## Files

| File | What it is |
|---|---|
| `compose.yml` | The agent and its two helpers |
| `compose.local.yml` / `compose.server.yml` | What to watch on a laptop / on the server |
| `config.alloy` | What Alloy collects and where it sends it |
| `docker-api.cfg` | The list of Docker API calls the agent may make |
| `container-stats.mjs` | Small exporter for container and disk metrics |
| `dashboards/`, `alerts/` | Grafana dashboards and alert rules as JSON |
| `import-grafana.mjs` | Loads the dashboards and alert rules into Grafana |
| `deploy.sh` | Deploys the agent over SSH, called by `.github/workflows/monitoring.yml` |

## Run it on a laptop

You need Docker and the five `GRAFANA_*` values in the root `.env` (see `.env.example`). The token only needs the `metrics:write` and `logs:write` scopes. Run these in Git Bash from the repo root:

```bash
docker compose -p vmenu-local --env-file .env -f infra/compose/docker-compose.yml up --build -d --wait
mkdir -p infra/monitoring/.local && touch infra/monitoring/.local/deploy-history.log
docker compose --env-file .env -f infra/monitoring/compose.yml -f infra/monitoring/compose.local.yml up -d --wait
```

Data appears in Grafana within two minutes, labelled `env="local"`. Alerts ignore that environment.

To stop everything:

```bash
docker compose --env-file .env -f infra/monitoring/compose.yml -f infra/monitoring/compose.local.yml down
docker compose -p vmenu-local -f infra/compose/docker-compose.yml down
```

## Deploy it to the server

These steps are for the repo owner, and each is needed only once:

1. On the server, create the folder:
   ```bash
   sudo install -d -m 750 -o deploy -g deploy /srv/monitoring
   ```
2. In Grafana Cloud, create a separate token for the server (scopes `metrics:write` and `logs:write`).
3. In GitHub, go to **Settings > Environments > staging** and add these secrets: `GRAFANA_PROM_URL`, `GRAFANA_PROM_USER`, `GRAFANA_LOKI_URL`, `GRAFANA_LOKI_USER`, `GRAFANA_CLOUD_TOKEN`.
4. Merge the PR into `staging`, or run the **Monitoring** workflow from the Actions tab on `staging`.

After that, every merge into `staging` that changes this folder redeploys the agent. Both the staging and production stacks must already exist on the server.

## Load the dashboards and alerts

Create a service account with the **Editor** role in Grafana (**Administration > Users and access > Service accounts**), add a token, then run:

```bash
GRAFANA_URL=https://<stack>.grafana.net GRAFANA_SA_TOKEN=<token> node infra/monitoring/import-grafana.mjs
```

It is safe to run again. Alerts go to the stack's default contact point.

## Kitchen metrics (B10)

| Metric | What it means |
|---|---|
| `vmenu_orders_total{status}` | Orders that entered each status: `pending` when placed, then `preparing`, `ready`, `served` or `cancelled`. It counts steps, so one served order adds 1 to four statuses. |
| `vmenu_order_ready_seconds` | Histogram: seconds from the customer's order to "ready" |
| `vmenu_orders_pending_oldest_seconds` | How long the oldest pending order has waited, read from the database at each scrape. Orders placed over 24 hours ago don't count, so one forgotten order can't keep the alert on. |
| `vmenu_orders_rate_limited_total` | Orders refused by the order rate limits (VM-22): too many from one client in a minute, or from one table in 10 minutes |
| `vmenu_image_uploads_total{result}` | Photo uploads: `ok`, `not_a_photo`, `too_large`, `bad_request`, `denied`, `rate_limited` or `error` |

The **Order pending for over 15 minutes** alert reads the third one. The agent only forwards metrics on its keep-list in `config.alloy`, which now includes every `vmenu_*` metric from the services.

Counters restart at 0 when a service restarts, and `increase()` and `rate()` in the dashboard handle that. Each status and result is listed at 0 from the start, because `increase()` can't see a series' first value.

## Failed access (SEC-10)

Every request a service refuses with 401, 403 or 429 is counted in `vmenu_auth_failures_total{service, reason}` and written as one `access refused` log line.

| Reason | Meaning |
|---|---|
| `no_token` | No session or key was sent |
| `bad_token` | The session, Firebase sign-in or key isn't valid |
| `expired` | The session has ended |
| `wrong_role` | Signed in, but without the role this needs |
| `other_restaurant` | Signed in, but for a different restaurant |
| `rate_limited` | Over a rate limit |
| `cross_site` | A write from another website |
| `other` | Refused for a reason not listed above |

- **The log line** has the request id, method, route, restaurant, role and reason. The email is masked (`s***@gmail.com`). It never has a token, a key, the query string or the request's headers.
- **The answer to the caller doesn't change.** The reason is only in our logs and metrics.
- **A refusal passed on from another service** is counted once, by the service that refused it.
- **The Many refused requests alert** fires above 50 refusals in 5 minutes per environment. A signed-out kitchen screen doesn't trigger it, because a 401 sends that screen to the login page and stops its polling. If real traffic makes it noisy, raise the number in `alerts/vmenu-alerts.json`.

## DORA metrics

| Metric | How it is measured |
|---|---|
| Deployment frequency | Successful deploys per day |
| Change failure rate | Failed deploys divided by all deploy attempts |
| Time to restore | Average run time of successful rollbacks. For an automatic rollback this includes the failed deploy before it. It does not include the time before someone starts a manual rollback. |
| Lead time for changes | Average time from commit to live. Each deploy records the average age of the commits it ships, as a `lead-time` line in `deploy-history.log`. |

Grafana can reject log lines that are too old, so the history may start around the day the agent was first deployed.

## Security notes for review

- **Docker access goes through a filter.** Mounting the socket `:ro` does not limit API calls, so `docker-api` allows only specific `GET` requests. Creating, stopping or exec-ing containers, and copying files out of them, all get a 403.
- **Remaining risk:** container inspect is needed to read logs, and it returns each container's environment variables. If the agent were compromised, it could read those values, including `JWT_SECRET` and the MongoDB URIs.
- **The containers are locked down.** They have read-only filesystems, no Linux capabilities and no privilege escalation. Alloy and `container-stats` also run as non-root users.
- **No secret folders are mounted.** The agent gets only the `deploy-history.log` files, not `/srv/vmenu/<env>/`, `/` or `/var/lib/docker`.
- **MongoDB is out of reach.** Alloy joins each stack's `frontend` network, which does not contain it.
- **The Grafana token is write-only.** It cannot read data or change the Grafana account.
