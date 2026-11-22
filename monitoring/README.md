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
| Container CPU, memory, network | Docker stats | Overview dashboard, alerts |
| Server CPU, memory, network, disk | `/proc`, `/sys`, Docker's disk | Overview dashboard, alerts |
| Service and frontend logs | Docker logs, with customer IPs removed | Overview dashboard |
| Deploys, rollbacks, results | `deploy-history.log` | DORA dashboard, alerts |

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
docker compose -p vmenu-local up --build -d --wait
mkdir -p monitoring/.local && touch monitoring/.local/deploy-history.log
docker compose --env-file .env -f monitoring/compose.yml -f monitoring/compose.local.yml up -d --wait
```

Data appears in Grafana within two minutes, labelled `env="local"`. Alerts ignore that environment.

To stop everything:

```bash
docker compose --env-file .env -f monitoring/compose.yml -f monitoring/compose.local.yml down
docker compose -p vmenu-local down
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
GRAFANA_URL=https://<stack>.grafana.net GRAFANA_SA_TOKEN=<token> node monitoring/import-grafana.mjs
```

It is safe to run again. Alerts go to the stack's default contact point.

## DORA metrics

| Metric | How it is measured |
|---|---|
| Deployment frequency | Successful deploys per day |
| Change failure rate | Failed deploys divided by all deploy attempts |
| Time to restore | Average run time of successful rollbacks. For an automatic rollback this includes the failed deploy before it. It does not include the time before someone starts a manual rollback. |
| Lead time for changes | **Not measured yet.** `deploy-history.log` has no commit time. |

Grafana can reject log lines that are too old, so the history may start around the day the agent was first deployed.

## Security notes for review

- **Docker access goes through a filter.** Mounting the socket `:ro` does not limit API calls, so `docker-api` allows only specific `GET` requests. Creating, stopping or exec-ing containers, and copying files out of them, all get a 403.
- **Remaining risk:** container inspect is needed to read logs, and it returns each container's environment variables. If the agent were compromised, it could read those values, including `JWT_SECRET` and the MongoDB URIs.
- **The containers are locked down.** They have read-only filesystems, no Linux capabilities and no privilege escalation. Alloy and `container-stats` also run as non-root users.
- **No secret folders are mounted.** The agent gets only the `deploy-history.log` files, not `/srv/vmenu/<env>/`, `/` or `/var/lib/docker`.
- **MongoDB is out of reach.** Alloy joins each stack's `frontend` network, which does not contain it.
- **The Grafana token is write-only.** It cannot read data or change the Grafana account.
