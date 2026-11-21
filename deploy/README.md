# Deploying V-Menu

Two environments on one server, deployed only by GitHub Actions:

| | Staging | Production |
|---|---|---|
| Trigger | every merge to `main` | a `v*` tag (e.g. `v1.2.0`) + approval |
| Image tag | `sha-<7 chars>` | `1.2.0` |
| Approval | none | required reviewer (Raksa) |
| Folder on the server | `/srv/vmenu/staging` | `/srv/vmenu/prod` |
| Frontend (local only) | `127.0.0.1:3401` | `127.0.0.1:3400` |
| Public address | `https://$STAGING_HOST` | `https://$PROD_HOST` |
| Databases | `vmenu_staging_*` | `vmenu_prod_*` |

```
merge to main ─► M3 release.yml: build + push ghcr.io/raksaoc/vmenu-*:sha-xxxxxxx
                   └─► deploy.yml (staging) ─► SSH as deploy ─► remote-deploy.sh staging sha-xxxxxxx
tag v1.2.0    ─► M3 release.yml: push :1.2.0
                   └─► deploy.yml (production) ─► waits for approval ─► remote-deploy.sh prod 1.2.0

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
| `compose.deploy.yml` | Added on top of `docker-compose.prod.yml`: frontend on 127.0.0.1 only, log size limits |
| `compose.mongo-host.yml` / `compose.mongo-container.yml` | How the services reach MongoDB (`MONGO_MODE`) |
| `compose.proxy-network.yml` | Only with `PROXY_NETWORK`: the frontend joins an existing Docker reverse proxy's network |
| `remote-deploy.sh` | Runs on the server: pull, start, wait for healthy, smoke test, auto-rollback on failure |
| `ci-deploy.sh` | Runs in GitHub Actions: writes env files from secrets, copies them, calls `remote-deploy.sh` |
| `backup-mongo.sh` | Daily `mongodump`, installed by `setup-server.sh` |
| `staging.env.example`, `prod.env.example` | Every secret and variable, and where it goes |
| `../.github/workflows/deploy.yml` | The deploy job (called by M3's release workflow, or run by hand) |
| `../.github/workflows/rollback.yml` | One-click rollback |
| `../.github/workflows/deploy-test.yml` | Tests all of the above on a throwaway runner |

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
git clone https://github.com/RaksaOC/V-Menu.git && cd V-Menu   # the branch that has deploy/
sudo STAGING_HOST=staging.example.com PROD_HOST=example.com \
     DEPLOY_PUBKEY="$(cat vmenu_deploy.pub)" \
     MONGO_MODE=host \
     bash deploy/setup-server.sh
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
- Deployment branches and tags: `main` only.

Create **`production`**:
- Required reviewers: Raksa.
- Deployment branches and tags: tags matching `v*` only.

Add these to **both** environments, with different values for each (see `staging.env.example` / `prod.env.example`):

| Secrets | Variables |
|---|---|
| `SSH_HOST`, `SSH_USER` (= `deploy`), `SSH_KEY` | `FRONTEND_PORT` (3401 staging, 3400 prod) |
| `SSH_KNOWN_HOSTS` (printed at the end of `setup-server.sh`) | `PUBLIC_URL` |
| `MONGODB_URI_RESTAURANT`, `MONGODB_URI_MENU`, `MONGODB_URI_ORDER` | `MONGO_MODE`, `MONGO_NETWORK` (container mode only), `PROXY_NETWORK` (optional) |
| `JWT_SECRET`, `INTERNAL_API_KEY` (`openssl rand -hex 32`) | `FIREBASE_PROJECT_ID`, `LOG_LEVEL` |

Missing secrets make the deploy fail at once, with the missing names listed.

### 6. Firebase

Add both hostnames under Firebase → Authentication → Settings → Authorized domains, or sign-in will fail there.

## Everyday use

| I want to… | Do this |
|---|---|
| Deploy to staging | Merge a PR into `main` |
| Release to production | `git tag v1.2.0 && git push origin v1.2.0`, then approve in Actions |
| Roll back | Actions → **Rollback** → environment → Run (leave tag empty) |
| Go to one specific version | Actions → **Rollback** → put the tag, e.g. `sha-1a2b3c4` |
| Load demo data on staging | Actions → **Deploy** → staging, current tag, tick "Load demo data" |
| See what ran when | `/srv/vmenu/<env>/deploy-history.log` (time, action, tag, result, seconds) |

### What a deploy does (`remote-deploy.sh`)

1. Writes `TAG=<tag>` to `.env` and pulls the images. If the tag doesn't exist, it stops here and nothing changes.
2. Runs `docker compose up -d --wait`, which waits until every container's health check passes. `/health` returns 503 until MongoDB is connected.
3. Smoke test: `/health` and `/version` of every service, plus the frontend. On a normal deploy, `/version` must equal the full commit SHA that was built.
4. On success, records the tag in `.tag_stack`, `.current_tag` and `.previous_tag`, and prunes V-Menu images older than 14 days.
5. On failure, puts the previous tag back automatically and fails the job.

`docker compose stop` sends SIGTERM and the services shut down gracefully, so requests in flight finish.

### Rollback

`rollback.yml` runs `remote-deploy.sh <env> --rollback`, which redeploys the tag in `.previous_tag`. The image is usually still on the server, so no download is needed. Production rollbacks still wait for the reviewer. `deploy-test.yml` measures the rollback time on every run (see its job summary).

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
- runs a backup.
