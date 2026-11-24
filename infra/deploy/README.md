# Deploying V-Menu

Two environments on one server, deployed only by GitHub Actions:

| | Staging | Production |
|---|---|---|
| Trigger | every merge/push to `staging` | every merge/push to `main` |
| Image tag | `sha-<7 chars>` | `sha-<7 chars>` |
| Who | anyone, through a PR (no direct pushes) | Raksa only (repo ruleset) |
| Folder on the server | `/srv/vmenu/staging` | `/srv/vmenu/prod` |
| Frontend (local only) | `127.0.0.1:3401` | `127.0.0.1:3400` |
| Public address | `https://$STAGING_HOST` | `https://$PROD_HOST` |
| Databases | `vmenu_staging_*` | `vmenu_prod_*` |

```
PR merged into staging ─► release.yml: build + scan + push ghcr.io/raksaoc/vmenu-*:sha-xxxxxxx
                           └─► deploy.yml (staging) ─► SSH as deploy ─► remote-deploy.sh staging sha-xxxxxxx
Raksa merges staging ─► main ─► release.yml ─► deploy.yml (production) ─► remote-deploy.sh prod sha-xxxxxxx

internet ─► Caddy :443 (HTTPS) ─┬─ staging host ─► 127.0.0.1:3401 ─► vmenu-staging stack
                                └─ prod host    ─► 127.0.0.1:3400 ─► vmenu-prod stack
                                     each stack: frontend + restaurant/menu/order services
                                     services ─► MongoDB on the server (one DB per service per env)
```

Nobody logs into the server to deploy. The workflow writes the env files from GitHub secrets, copies them with the compose files, and runs `remote-deploy.sh`.

## Files

| File | What it is |
|---|---|
| `setup-server.sh` | One-time server setup, run as root (below) |
| `Caddyfile` | HTTPS reverse proxy; hostnames come from `/etc/caddy/vmenu.env` |
| `compose.deploy.yml` | Added on top of `infra/compose/docker-compose.prod.yml`: frontend on 127.0.0.1 only, log size limits |
| `compose.mongo-host.yml` / `compose.mongo-container.yml` | How the services reach MongoDB (`MONGO_MODE`) |
| `compose.proxy-network.yml` | Only with `PROXY_NETWORK`: the frontend joins an existing Docker reverse proxy's network |
| `remote-deploy.sh` | Runs on the server: pull, start, wait for healthy, smoke test, auto-rollback on failure |
| `ci-deploy.sh` | Runs in GitHub Actions: writes env files from secrets, copies them, calls `remote-deploy.sh` |
| `backup-mongo.sh` | Daily `mongodump`, installed by `setup-server.sh` |
| `staging.env.example`, `prod.env.example` | Every secret and variable, and where it goes |
| `../../.github/workflows/deploy.yml` | The deploy job (called by M3's release workflow, or run by hand), then the post-deploy checks of staging |
| `../../.github/workflows/rollback.yml` | One-click rollback |
| `../../.github/workflows/deploy-test.yml` | Tests all of the above on a throwaway runner |

## One-time setup (Raksa, on the server)

### 1. Make the CI key pair (on your own machine)

```bash
ssh-keygen -t ed25519 -N "" -C vmenu-deploy -f vmenu_deploy
# vmenu_deploy      -> GitHub secret SSH_KEY (whole file)
# vmenu_deploy.pub  -> DEPLOY_PUBKEY below
```

### 2. MongoDB

`MONGO_MODE` says how Mongo runs on the server:

- **`host`**: `mongod` is a normal system service. The containers reach it as `host.docker.internal`.
  `mongod` must also listen on the Docker bridge. In `/etc/mongod.conf`:
  ```yaml
  net:
    bindIp: 127.0.0.1,172.17.0.1
  security:
    authorization: enabled
  ```
  then `sudo systemctl restart mongod`. `setup-server.sh` opens 27017 to Docker networks only (172.16.0.0/12), never to the internet.
- **`container`**: Mongo is a Docker container. Set `MONGO_NETWORK` to its network (`docker inspect <container> --format '{{json .NetworkSettings.Networks}}'`), and use the container name as the host in the URIs.

Create one user per environment (in `mongosh` as an admin):

```js
use admin
db.createUser({ user: "vmenu_staging", pwd: passwordPrompt(), roles: [
  { role: "readWrite", db: "vmenu_staging_restaurants" },
  { role: "readWrite", db: "vmenu_staging_menu" },
  { role: "readWrite", db: "vmenu_staging_orders" } ] })
db.createUser({ user: "vmenu_prod", pwd: passwordPrompt(), roles: [
  { role: "readWrite", db: "vmenu_prod_restaurants" },
  { role: "readWrite", db: "vmenu_prod_menu" },
  { role: "readWrite", db: "vmenu_prod_orders" } ] })
db.createUser({ user: "vmenu_backup", pwd: passwordPrompt(), roles: ["backup"] })
```

### 3. Run the setup script

```bash
git clone https://github.com/RaksaOC/V-Menu.git && cd V-Menu   # the branch that has infra/deploy/
sudo STAGING_HOST=staging.example.com PROD_HOST=example.com \
     DEPLOY_PUBKEY="$(cat vmenu_deploy.pub)" \
     MONGO_MODE=host \
     bash infra/deploy/setup-server.sh
```

No domain yet? Use `STAGING_HOST=staging.<ip>.sslip.io PROD_HOST=<ip>.sslip.io`. Both need to point at the server, and ports 80 and 443 must be reachable from the internet for HTTPS.

Read the script first. It:
1. installs Docker if missing (Compose 2.24.4+ is required),
2. creates the `deploy` user with only the CI key,
3. creates `/srv/vmenu/{staging,prod,backups}`,
4. turns on ufw for SSH, 80 and 443. If ufw is off and other public ports are in use, it stops and asks first (`FIREWALL=no` skips this step),
5. installs Caddy. If something else (e.g. nginx) already owns 80/443, it skips Caddy and tells you what to route,
6. installs a daily backup at 03:15.

It is safe to run again (e.g. to change hostnames).

**Already running nginx?** Route the two hostnames instead of installing Caddy:

```nginx
server {
    server_name staging.example.com;
    location / {
        proxy_pass http://127.0.0.1:3401;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # listen 443 ssl; + certificates (certbot --nginx)
}
# same again for example.com -> 127.0.0.1:3400
```

**Already running a reverse proxy in Docker (Traefik, e.g. Coolify's)?** Set the Environment variable `PROXY_NETWORK` to that proxy's Docker network. The frontend then also joins it, and the proxy routes by container name:
`https://$STAGING_HOST -> http://vmenu-staging-frontend-1:3400`, `https://$PROD_HOST -> http://vmenu-prod-frontend-1:3400`.
A Traefik file-provider example:

```yaml
http:
  routers:
    vmenu-staging:
      rule: Host(`staging.example.com`)
      entryPoints: [https]
      service: vmenu-staging
      tls: { certResolver: letsencrypt }
  services:
    vmenu-staging:
      loadBalancer:
        servers: [{ url: "http://vmenu-staging-frontend-1:3400" }]
```

### 4. Turn on backups

Put the backup user's URI in `/etc/vmenu/backup.env` (`MONGO_BACKUP_URI=mongodb://vmenu_backup:PASSWORD@127.0.0.1:27017/?authSource=admin`), then test it with `sudo /usr/local/bin/vmenu-backup`. Backups go to `/srv/vmenu/backups`, and 7 days are kept. Restore instructions are at the top of `backup-mongo.sh`.

### 5. GitHub settings (Settings → Environments)

Create **`staging`**:
- Deployment branches and tags: `staging` only.

Create **`production`**:
- Deployment branches and tags: `main` only. No required reviewer: merging into `main` is the
  approval, and `deploy.yml` refuses a production deploy started by anyone but the owner.

Branch rulesets (Settings → Rules → Rulesets):
- **main: owner only**: restrict updates, block deletion and force pushes; bypass: repository admin.
- **staging: PRs only**: require a pull request, block deletion and force pushes; bypass: repository admin.

Add these to **both** environments, with different values for each (see `staging.env.example` / `prod.env.example`):

| Secrets | Variables |
|---|---|
| `SSH_HOST`, `SSH_USER` (= `deploy`), `SSH_KEY` | `FRONTEND_PORT` (3401 staging, 3400 prod) |
| `SSH_KNOWN_HOSTS` (printed at the end of `setup-server.sh`) | `PUBLIC_URL` |
| `MONGODB_URI_RESTAURANT`, `MONGODB_URI_MENU`, `MONGODB_URI_ORDER` | `MONGO_MODE`, `MONGO_NETWORK` (container mode only), `PROXY_NETWORK` (optional) |
| `JWT_SECRET`, `INTERNAL_API_KEY` (`openssl rand -hex 32`) | `FIREBASE_PROJECT_ID`, `LOG_LEVEL` |

Missing secrets make the deploy fail at once, with the missing names listed.

### 6. Firebase

Staging and production use separate Firebase projects, so a staging account never exists in production:

| Environment | Firebase project | Where the config lives |
|---|---|---|
| staging | `v-menu-staging` | `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_PROJECT_ID` in the **staging** environment's Variables |
| production | `v-menu-e9835` | `NEXT_PUBLIC_FIREBASE_*` in the repository Variables, `FIREBASE_PROJECT_ID` in the **production** environment |

The image build (`release.yml`) runs in the branch's environment, so staging's Variables override the repository ones. Analytics is only built into production.

Add each hostname under its project's Firebase → Authentication → Settings → Authorized domains, or sign-in will fail there. The console rejects some hyphenated names such as `staging-v-menu.chanraksa.com`; add those with the Identity Toolkit API (`PATCH .../admin/v2/projects/<id>/config?updateMask=authorizedDomains`).

## Everyday use

| I want to… | Do this |
|---|---|
| Deploy to staging | Merge a PR into `staging` (direct pushes are blocked, except for Raksa) |
| Release to production | Raksa opens a PR `staging` → `main` and merges it |
| Roll back | Actions → **Rollback** → "Use workflow from": `staging` for staging, `main` for production → environment → Run (leave tag empty) |
| Go to one specific version | Same, and put the tag, e.g. `sha-1a2b3c4` |
| Load demo data on staging | Actions → **Deploy** → staging, current tag, tick "Load demo data" |
| See what ran when | `/srv/vmenu/<env>/deploy-history.log` (time, action, tag, result, seconds). A `lead-time` line holds the seconds from commit to live. |

### What a deploy does (`remote-deploy.sh`)

1. Writes `TAG=<tag>` to `.env` and pulls the images. If the tag doesn't exist, it stops here and nothing changes.
2. Runs `docker compose up -d --wait`, which waits until every container's health check passes. `/ready` returns 503 until MongoDB is connected (and while shutting down); `/health` only says the process is alive.
3. Smoke test: `/ready` and `/version` of every service, plus the frontend. On a normal deploy, `/version` must equal the full commit SHA that was built.
4. On success, records the tag in `.tag_stack`, `.current_tag` and `.previous_tag`, and prunes V-Menu images older than 14 days.
5. On failure, puts the previous tag back automatically and fails the job.

`docker compose stop` sends SIGTERM and the services shut down gracefully, so requests in flight finish.

### After a staging deploy: the post-deploy checks (B7)

Once a staging deploy has passed its smoke test, the `post-deploy` job in `deploy.yml` tests staging from the outside, through Caddy and HTTPS, like a customer would. It doesn't run after a rollback, for production, or when no server is configured yet.

| Step | What it checks | If it fails |
|---|---|---|
| Demo data | `scripts/check-demo-data.mjs`: `demo-bistro` exists, has dishes and has table `T1` | The message says how to load the demo data (see below). The browser tests are skipped. |
| Security headers | `scripts/check-headers.mjs` (SEC-02) on `/`, a customer page and the staff logins | The job summary lists the missing headers per page |
| Browser tests | The e2e specs tagged `@post-deploy`: a customer orders at `T1`, the kitchen API sees the order, then the cashier cancels it so the kitchen queue stays clean | The Playwright report is in the `post-deploy` artifact |
| ZAP baseline | Passive OWASP ZAP scan (SEC-09): spider plus passive checks only, no attacks | Fails on a High alert not listed in `.zap/known-high.txt`; the reports are in the `post-deploy` artifact |

- **Every check runs**, even when an earlier one failed, so one run shows everything that's wrong.
- **Staff tokens.** The browser tests need a chef and a cashier. One step signs two 10-minute tokens for the demo restaurant with staging's `JWT_SECRET` (`scripts/staff-token.mjs`) and passes only the tokens on. Playwright never sees the secret, and no server secret reaches this job.
- **On failure** the run turns red, and the `post-deploy-failed` job adds a `post-deploy-check <tag> failed` line to staging's `deploy-history.log` (`remote-deploy.sh staging --check-failed`). The monitoring agent ships it, and the **Deploy failed** alert fires. Staging keeps the new version: this is a signal for a person, not a rollback. Roll back by hand if the version is broken.
- **Demo data missing?** Run it once: Actions → **Deploy** → Run workflow on `staging`, environment `staging`, the current tag, tick **Load demo data**. The post-deploy checks run again after it.
- **Run the same browser test locally** against your own stack: `cd e2e && BASE_URL=http://localhost:3400 npx playwright test --grep @post-deploy`. It also runs in CI's `e2e` job with the other specs. Never point it at production.

### Rollback

`rollback.yml` runs `remote-deploy.sh <env> --rollback`, which redeploys the tag in `.previous_tag`. It uses the images already on the server and downloads only missing ones, so it doesn't wait on GHCR, and it gets the build that actually ran even if that tag was pushed again since. The same applies when a failed deploy puts the previous tag back.

- Run it from the branch that matches the environment: `staging` for staging, `main` for production. Any other branch is refused by the environment's branch rule ("Branch main is not allowed to deploy to staging").
- Only the repo owner can roll back production.
- `deploy-test.yml` measures the rollback time on every run (see its job summary).

### Emergency, by hand

Only if GitHub Actions is down:

```bash
sudo -u deploy bash /srv/vmenu/staging/remote-deploy.sh staging --rollback
sudo -u deploy docker compose -p vmenu-staging ps
```

## Testing changes to this folder

Every push to an `infra/**` branch that touches these files runs **Deploy test**. It:

- lints the scripts (shellcheck) and workflows (actionlint);
- runs `setup-server.sh` twice on a fresh runner;
- deploys two versions, seeds, rolls back, and deploys prod next to staging;
- checks HTTPS through Caddy;
- checks that a missing image and a wrong commit are both refused while staging stays up;
- records a failed post-deploy check, and refuses one for production;
- runs a backup.
