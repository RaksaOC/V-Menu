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
| `compose.storage-network.yml` | Only with `STORAGE_NETWORK`: menu-service joins the Docker network MinIO is on (menu photos, PHOTOS-S3) |
| `remote-deploy.sh` | Runs on the server: pull, start, wait for healthy, smoke test, auto-rollback on failure |
| `ci-deploy.sh` | Runs in GitHub Actions: writes env files from secrets, copies them, calls `remote-deploy.sh` |
| `backup-mongo.sh` | Daily `mongodump`, installed by `setup-server.sh` |
| `mongo-users.js` | The database users and their roles, and a read-only check of them (SEC-11) |
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

#### Check the database users (SEC-11)

Each environment's user must reach **only its own** databases. `mongo-users.js` holds the expected users and roles, and compares them with the real ones. It only reads: it doesn't change a user, and it doesn't print passwords.

Run it on the server, as a Mongo admin, once now and after any change to the users:

```bash
scp infra/deploy/mongo-users.js <server>:/tmp/mongo-users.js    # from your machine
# on the server:
mongosh "mongodb://127.0.0.1:27017/admin" -u <admin> -p --quiet --file /tmp/mongo-users.js
rm /tmp/mongo-users.js
```

- **Use the real database names.** The script expects the names in the table at the top of this file. Compare them with the database in each `MONGODB_URI_*` secret. If an environment uses other names, pass them for this run, and don't commit them:
  ```bash
  VMENU_STAGING_DBS=name1,name2,name3 VMENU_PROD_DBS=name4,name5,name6 mongosh ... --file /tmp/mongo-users.js
  ```
- **`ok` on every line:** nothing to do.
- **`WRONG ...`:** it names the user and the role. Remove a role that shouldn't be there, or add a missing one, then run the check again:
  ```js
  db.getSiblingDB("admin").revokeRolesFromUser("<user>", [{ role: "<role>", db: "<database>" }])
  db.getSiblingDB("admin").grantRolesToUser("<user>", [{ role: "readWrite", db: "<database>" }])
  ```
- **If the names differ from the table,** update the table and the two `.env.example` files, so the docs say what's real.

CI proves the rules on a real MongoDB: `infra/checks/check-db-isolation.sh`, in the `integration` job, starts a throwaway MongoDB with these users. It checks that staging can't read or write production's databases and the other way round, and that the check catches a user with one role too many. You can run it locally with Docker.

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

### 4b. Photo storage (MinIO, PHOTOS-S3)

Menu photos live in S3-compatible object storage, not in MongoDB. The server's MinIO is a container on Coolify's `coolify` network, public at `https://files.chanraksa.com` (its CORS already allows browser POST). Each environment gets its own bucket and its own MinIO user, which can reach only that bucket. The buckets stay **private**: photos are shown through signed links that menu-service hands out.

Do this once, on the server, before the first deploy that has PHOTOS-S3 (without it, menu-service never becomes ready and the deploy rolls back by itself):

```bash
# MinIO's container, and its root user and password (Coolify shows them in the MinIO service's settings)
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Networks}}' | grep -i minio
M=<the MinIO container name>
docker exec -it "$M" mc alias set local http://127.0.0.1:9000 '<root user>' '<root password>'
docker exec "$M" mc admin info local        # check: the alias works

for env in staging prod; do
  # the bucket
  docker exec "$M" mc mb --ignore-existing "local/vmenu-$env"
  # a policy for that bucket only: read, write and delete objects, and read and set its lifecycle rule
  cat > "/tmp/vmenu-$env.json" <<JSON
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":["s3:GetBucketLocation","s3:ListBucket","s3:GetLifecycleConfiguration","s3:PutLifecycleConfiguration"],"Resource":["arn:aws:s3:::vmenu-$env"]},
 {"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],"Resource":["arn:aws:s3:::vmenu-$env/*"]}]}
JSON
  docker cp "/tmp/vmenu-$env.json" "$M:/tmp/vmenu-$env.json" && rm "/tmp/vmenu-$env.json"
  docker exec "$M" mc admin policy create local "vmenu-$env" "/tmp/vmenu-$env.json"
  # the user: its secret goes into the GitHub Environment as S3_SECRET_KEY, nowhere else
  secret=$(openssl rand -hex 24); echo "vmenu-$env secret key: $secret"
  docker exec "$M" mc admin user add local "vmenu-$env" "$secret"
  docker exec "$M" mc admin policy attach local "vmenu-$env" --user "vmenu-$env"
  # uploads nobody confirmed expire after a day (menu-service also sets this at startup)
  docker exec "$M" mc ilm rule add --prefix incoming/ --expire-days 1 "local/vmenu-$env"
  docker exec "$M" mc ilm rule ls "local/vmenu-$env"
  docker exec "$M" mc anonymous get "local/vmenu-$env"   # must say "none": the bucket is private
done
docker exec "$M" mc admin config get local region    # S3_REGION; empty means us-east-1
```

Then, in GitHub (Settings → Environments), for **staging** and **production**:

| Secrets | Variables |
|---|---|
| `S3_ACCESS_KEY` (`vmenu-staging` / `vmenu-prod`) | `S3_ENDPOINT` = `http://<MinIO container name>:9000` |
| `S3_SECRET_KEY` (the secret printed above) | `S3_BUCKET` (`vmenu-staging` / `vmenu-prod`) |
| | `S3_PUBLIC_URL` = `https://files.chanraksa.com`, `S3_REGION`, `STORAGE_NETWORK` = `coolify` |

And a **repository** variable `S3_PUBLIC_URL` = `https://files.chanraksa.com`: the release workflow builds it into the frontend's CSP, so browsers may post photos to storage and load them from it.

With `STORAGE_NETWORK` set, menu-service also joins that network (`compose.storage-network.yml`) and reaches MinIO by its container name. Its `/ready` answers 503 while it can't reach MinIO, so a wrong setting fails the deploy and rolls it back.

**Photos from before.** At its first start, menu-service copies every photo from MongoDB GridFS to the bucket, under the same ids, and logs `moved photos from GridFS to object storage`. Links saved on dishes keep working. GridFS keeps its copy for one release, in case of a rollback. A rollback to a version from before PHOTOS-S3 still shows the old photos, but not the ones uploaded since.

**Dropping the GridFS copies** (one release later, after a backup), for each environment's menu database:

```js
// mongosh, in vmenu_staging_menu (then vmenu_prod_menu)
db.getCollection("images.files").countDocuments({ "metadata.movedTo": { $exists: false } })  // must be 0
db.getCollection("images.chunks").drop()
db.getCollection("images.files").drop()
```

### 5. GitHub settings (Settings → Environments)

Create **`staging`**:
- Deployment branches and tags: `staging` only.

Create **`production`**:
- Deployment branches and tags: `main` only. No required reviewer: merging into `main` is the
  approval, and `deploy.yml` refuses a production deploy started by anyone but the owner.

Branch rulesets (Settings → Rules → Rulesets):
- **main: owner only**: restrict updates, block deletion and force pushes; bypass: repository admin.
- **staging: PRs only**: require a pull request, block deletion and force pushes; bypass: repository admin. Require the status checks listed below.

#### Required checks (B8)

Set these on the **staging: PRs only** ruleset, under **Require status checks to pass**. The names must match exactly, including the brackets:

<!-- required-checks -->
- `test`: the gate over every package's tests, including the frontend's unit tests
- `integration`: the real services, the smoke test and the database-user check (SEC-11)
- `e2e`: every browser spec
- `audit (frontend)`
- `audit (services/restaurant-service)`
- `audit (services/menu-service)`
- `audit (services/order-service)`
- `semgrep`: **add this one.** It's the code scan (SEC-09). It already fails a PR with a new high finding, but until it's required, that PR can still be merged.
<!-- /required-checks -->

- **Pick `semgrep` in lowercase.** `Semgrep OSS` is a different check, from the Semgrep app.
- **Don't require** `validate`, `lint` or `vm-test`. They only run when certain files change, so every other PR would wait for them for ever. Don't require `deploy` either: it only runs after a merge.
- **A job that's skipped counts as passed** on GitHub. So when `test` fails, `integration` and `e2e` show "skipped", and it's `test` that blocks the merge. Keep all three required.
- **To compare with what's set now** (read-only):
  ```bash
  gh api repos/RaksaOC/V-Menu/rulesets/27796986 --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context'
  ```
- `scripts/required-checks.test.mjs` fails if one of these jobs is renamed, stops running on every PR, or can no longer fail.

Add these to **both** environments, with different values for each (see `staging.env.example` / `prod.env.example`):

| Secrets | Variables |
|---|---|
| `SSH_HOST`, `SSH_USER` (= `deploy`), `SSH_KEY` | `FRONTEND_PORT` (3401 staging, 3400 prod) |
| `SSH_KNOWN_HOSTS` (printed at the end of `setup-server.sh`) | `PUBLIC_URL` |
| `MONGODB_URI_RESTAURANT`, `MONGODB_URI_MENU`, `MONGODB_URI_ORDER` | `MONGO_MODE`, `MONGO_NETWORK` (container mode only), `PROXY_NETWORK` (optional) |
| `JWT_SECRET`, `INTERNAL_API_KEY` (`openssl rand -hex 32`) | `FIREBASE_PROJECT_ID`, `LOG_LEVEL` |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY` (PHOTOS-S3, section 4b) | `S3_ENDPOINT`, `S3_PUBLIC_URL`, `S3_BUCKET`, `S3_REGION`, `STORAGE_NETWORK` (section 4b) |

Missing secrets make the deploy fail at once, with the missing names listed.

### 6. Firebase

Staging and production use separate Firebase projects, so a staging account never exists in production:

| Environment | Firebase project | Where the config lives |
|---|---|---|
| staging | `v-menu-staging` | `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_PROJECT_ID` in the **staging** environment's Variables |
| production | `v-menu-e9835` | `NEXT_PUBLIC_FIREBASE_*` in the repository Variables, `FIREBASE_PROJECT_ID` in the **production** environment |

The image build (`release.yml`) runs in the branch's environment, so staging's Variables override the repository ones. Analytics is only built into production.

Add each hostname under its project's Firebase → Authentication → Settings → Authorized domains, or sign-in will fail there. The console rejects some hyphenated names such as `staging-v-menu.chanraksa.com`; add those with the Identity Toolkit API (`PATCH .../admin/v2/projects/<id>/config?updateMask=authorizedDomains`).

### 7. Firebase hardening checklist (SEC-08)

These are console settings, so code can't make them. Do each one in **both** projects unless it says otherwise, then tick it here in a PR. The Firebase "Browser key" is public by design (every visitor's browser gets it), so these settings are what stop other people using it against our projects.

**1. Restrict the API key.** Google Cloud console → APIs & Services → Credentials → the "Browser key (auto created by Firebase)":

- [ ] **Application restrictions → HTTP referrers:**
  - production: `https://v-menu.chanraksa.com/*`
  - staging: `https://staging-v-menu.chanraksa.com/*` and `http://localhost:*`
  - each project's own `https://<project>.firebaseapp.com/*`, which Firebase uses for email links
- [ ] **API restrictions → Restrict key:** only the **Identity Toolkit API** and the **Token Service API**. Production also needs the Firebase installations and analytics APIs while Analytics is on: check the key's usage in the console before removing them.

**2. Authorized domains.** Firebase → Authentication → Settings → Authorized domains:

- [ ] **production:** remove `localhost`. Only `v-menu.chanraksa.com` and the project's own `firebaseapp.com` / `web.app` domains stay.
- [ ] **staging:** `staging-v-menu.chanraksa.com`, plus `localhost` for local work.

**3. Email enumeration protection.** Authentication → Settings → User actions:

- [ ] Turn **Email enumeration protection** on. The app no longer asks Firebase whether an email has an account (VM-12), and "Forgot password?" gives the same answer either way (VM-14), so nothing in the app depends on it being off.

**4. Password policy.** Authentication → Settings → Password policy:

- [ ] **Enforce** a password policy with a minimum length of **8** and **Require numeric character** on.
- The app's forms already ask for 8 characters with a letter and a number when a password is set: the owner sign-up and "Create an account" at `/login`. Firebase's policy can't say "a letter" (only lowercase or uppercase), so the letter rule lives in the forms.
- [ ] Leave **"Require password change on sign-in"** off at first. Turn it on later if old short passwords should be changed.

**5. Email verification (VM-13).**

- [ ] Nothing to switch on: the app already requires a verified email before an invite counts. Check that the verification and password-reset email templates read well (Authentication → Templates).

**Check it.** `infra/checks/check-firebase-config.mjs` reads a project's settings (read only) and lists anything that doesn't match items 2 to 4. It needs a token that can read the project, for example `gcloud auth print-access-token` for an account with the Firebase Viewer role:

```bash
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" node infra/checks/check-firebase-config.mjs v-menu-e9835 production v-menu.chanraksa.com
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" node infra/checks/check-firebase-config.mjs v-menu-staging staging staging-v-menu.chanraksa.com
```

It doesn't check the API key restrictions (item 1); look at those in the console.

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
| Demo data | `infra/checks/check-demo-data.mjs`: `demo-bistro` exists, has dishes and has table `T1`, whose QR link opens it (read as the cashier: links by table name are off on the servers, SEC-04) | The message says how to load the demo data (see below). The browser tests are skipped. |
| Security headers | `infra/checks/check-headers.mjs` (SEC-02) on `/`, a customer page and the staff logins | The job summary lists the missing headers per page |
| Browser tests | The e2e specs tagged `@post-deploy`: a customer opens `T1` by its QR link and orders, the kitchen API sees the order, then the cashier cancels it so the kitchen queue stays clean | The Playwright report is in the `post-deploy` artifact |
| ZAP baseline | Passive OWASP ZAP scan (SEC-09): spider plus passive checks only, no attacks | Fails on a High alert not listed in `.zap/known-high.txt`; the reports are in the `post-deploy` artifact |

- **Every check runs**, even when an earlier one failed, so one run shows everything that's wrong.
- **Staff tokens.** The checks need a chef and a cashier. The first step signs two 10-minute tokens for the demo restaurant with staging's `JWT_SECRET` (`infra/checks/staff-token.mjs`) and passes only the tokens on. Playwright never sees the secret, and no server secret reaches this job. The tokens are the seeded demo owner's (`demo-owner`, or `SEED_OWNER_UID` if the seed was run with it): SEC-03 accepts a token only for someone who has that role there, and the seed gives the demo owner all three. They carry session version 0, as the seeded rows do. So don't use **Sign out everywhere** as the demo owner on staging: it would end these tokens too, and the post-deploy checks would fail with 401 until the demo owner's rows are back at version 0.
- **CI runs the same checks** in its `e2e` job, after the full suite, with links by table name turned off as on the servers (step "Post-deploy checks, table-name links off").
- **On failure** the run turns red, and the `post-deploy-failed` job adds a `post-deploy-check <tag> failed` line to staging's `deploy-history.log` (`remote-deploy.sh staging --check-failed`). The monitoring agent ships it, and the **Deploy failed** alert fires. Staging keeps the new version: this is a signal for a person, not a rollback. Roll back by hand if the version is broken.
- **Demo data missing?** Run it once: Actions → **Deploy** → Run workflow on `staging`, environment `staging`, the current tag, tick **Load demo data**. The post-deploy checks run again after it.
- **Run the same browser test locally** against your own stack: `cd e2e && BASE_URL=http://localhost:3400 npx playwright test --grep @post-deploy`. It also runs in CI's `e2e` job with the other specs. Never point it at production.

### Rollback

`rollback.yml` runs `remote-deploy.sh <env> --rollback`, which redeploys the tag in `.previous_tag`. It uses the images already on the server and downloads only missing ones, so it doesn't wait on GHCR, and it gets the build that actually ran even if that tag was pushed again since. The same applies when a failed deploy puts the previous tag back.

If the rollback's target doesn't start or fails its checks, the script puts back the version that was running, the same way a failed deploy does: `deploy-history.log` gets `rollback <target> failed`, then `auto-rollback <current> ok` (or `failed`), and the run stays red. The tag history doesn't change, so you can fix the cause and roll back again.

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
- checks that a rollback whose target doesn't start puts back the version that was running (scenario 10; `scripts/deploy-rollback.test.mjs` checks the same with a stand-in `docker`, in the repo checks);
- runs a backup.
