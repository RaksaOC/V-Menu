# V-Menu

QR-code ordering for restaurants. Customers scan the code on their table and order; the kitchen sees the queue; the cashier opens tables and closes bills; the owner runs menus, tables and staff across one or more restaurants.

The app started as a single Next.js project with its API routes and database access inside it. It is now split into three services, each with its own database, behind the Next.js frontend.

## Architecture

```
Browser ──► Next.js (frontend/, :3400)
              pages + /api/* rewrites
                 │
     ┌───────────┼──────────────────┐
     ▼           ▼                  ▼
restaurant-service  menu-service     order-service
     :4101           :4102             :4103
 restaurants,       items, tables     orders, table_orders
 tenants, sign-in
     │                  │                  │
vmenu_restaurants   vmenu_menu        vmenu_orders      (one MongoDB database each)
```

| Service | Owns | Public paths | Calls |
| --- | --- | --- | --- |
| `restaurant-service` | restaurants, staff (tenants), sign-in | `/api/auth/*`, `/api/restaurants/*`, `/api/staff` | none |
| `menu-service` | dishes, tables | `/api/menu/:slug/*` | restaurant-service |
| `order-service` | orders, bills, kitchen queue, stats | `/api/orders/*` | restaurant-service, menu-service |

- The browser only talks to the frontend. `frontend/next.config.ts` forwards each `/api` prefix to the service that owns it.
- Services talk to each other over REST on `/internal/*` routes. These routes need the `x-internal-key` header and are never forwarded from the browser.
- Each service has the same shape: Express 5 and TypeScript, Mongoose, `/health`, `/metrics` (Prometheus), and pino JSON logs.
- The `x-request-id` header is passed along, so one order can be traced through all three services' logs.

### Placing an order

1. The browser sends `POST /api/orders/:slug`.
2. order-service asks restaurant-service which restaurant the slug belongs to.
3. order-service asks menu-service whether the table is open and what each dish costs.
4. order-service saves the order and adds it to that table's open bill.

Prices always come from menu-service, never from the browser.

## Sign-in and access

1. The user signs in with Firebase Auth in the browser.
2. The browser sends the Firebase **ID token** to `/api/auth/login`.
3. restaurant-service verifies the token against Google's public keys. No service-account key is needed.
4. restaurant-service issues an **app token** (HS256 JWT, lasting `SESSION_HOURS`, 12 by default) holding `uid`, `role` and, for staff, `resId`. It is set **only** as an httpOnly, `SameSite=Lax` cookie, so page scripts can never read it (SEC-01). The browser sends it with every `/api/*` call.
5. Every service checks the role, and checks that the token's restaurant matches the one in the URL. Owners may only touch restaurants they own.
6. Writes (`POST`, `PUT`, `PATCH`, `DELETE`) whose `Origin` is another site get **403**, so another site can't use the cookie (CSRF). The services read the site's own address from the request; `ALLOWED_ORIGINS` adds others.
7. A `Authorization: Bearer` header is ignored unless `AUTH_ALLOW_BEARER=true`, which only the tests use.

## Run it

### With Docker (recommended)

Needs Docker with Compose v2 and Node 22+ (only to run the npm scripts below; nothing is installed on the host).

```bash
# 1. env files (once)
cp backend/services/restaurant/.env.example backend/services/restaurant/.env
cp backend/services/menu/.env.example       backend/services/menu/.env
cp backend/services/order/.env.example      backend/services/order/.env
cp .env.example .env   # then fill in your Firebase web config (read by docker compose)
# set FIREBASE_PROJECT_ID in backend/services/restaurant/.env to the same project

# 2. build and start
docker compose --env-file .env -f infra/compose/docker-compose.yml up --build -d   # mongo + 3 services + frontend (or: npm run docker:up)

# 3. demo data, then one order end to end
npm run docker:seed    # restaurant "demo-bistro", tables T1-T4, four dishes
npm run docker:order   # places an order at T1 through http://localhost:3400
```

Open http://localhost:3400. The customer page for the demo is http://localhost:3400/demo-bistro/customer/T1.

| Script | Does |
| --- | --- |
| `npm run docker:up` | `docker compose --env-file .env -f infra/compose/docker-compose.yml up --build -d`, plus the commit hash as `GIT_SHA` for `/version` |
| `npm run docker:down` | stops and removes the containers; the `mongo-data` volume keeps the data |
| `npm run docker:logs` | follows the logs of every container |
| `npm run docker:seed` | runs each service's own seed inside its container |
| `npm run docker:order` | places a test order through the frontend |

How the containers are wired (`infra/compose/docker-compose.yml`). Run `docker compose` from the repo root with `-f infra/compose/docker-compose.yml` (or `export COMPOSE_FILE=infra/compose/docker-compose.yml`), and add `--env-file .env` when building so the frontend gets the root `.env`:

- **One database per service on one MongoDB server** (`mongo:7`): `vmenu_restaurants`, `vmenu_menu`, `vmenu_orders`. Data lives in the `mongo-data` volume, so it survives restarts.
- **Two networks.** `backend` joins MongoDB and the services; `frontend` joins the frontend and the services. The frontend is not on `backend`, so it cannot reach MongoDB.
- **Only the frontend publishes a port** (`3400`). The services are reachable only inside Docker, by their Compose names (`http://restaurant-service:4101`).
- **Images.** Each service is a multi-stage build on `node:22-alpine` with production deps and `dist/` only. It runs as `node` and has a `HEALTHCHECK` on `/health`; `/version` returns the `GIT_SHA` it was built from.
- The root `.env` holds the Firebase web config for the frontend build. It has the same values as `frontend/.env.local`, which `npm run dev` uses, so update both if a key changes.
- The `backend/services/*/.env.example` secrets are placeholders that work locally. Run `npm run setup` (below) to generate real ones.
- To sign in as the demo owner, set `SEED_OWNER_UID` and `SEED_OWNER_EMAIL` in `backend/services/restaurant/.env` to your Firebase user, then run `npm run docker:seed` again.

**Production** (`infra/compose/docker-compose.prod.yml`, for M4) runs the same services from `ghcr.io/raksaoc/vmenu-<service>:${TAG}` images, with `restart: unless-stopped` and memory and CPU limits. MongoDB is off by default (Atlas); add `--profile mongo` to run it as a container.

```bash
# on the server, in /srv/vmenu/<env>/ (infra/deploy/ci-deploy.sh copies the file there)
TAG=<image tag> docker compose -f docker-compose.prod.yml up -d
```

### Without Docker

Requires Node 22+.

```bash
npm install            # root tools (concurrently, local MongoDB)
npm run setup          # installs every package, writes backend/services/*/.env with fresh shared secrets
cp frontend/.env.example frontend/.env.local   # then fill in your Firebase web config
npm run dev            # MongoDB + 3 services + frontend
npm run seed           # demo data (in another terminal)
```

- `npm run dev` starts a local MongoDB on `127.0.0.1:27017`, with data in `.data/mongo`. To use Atlas instead, set `MONGODB_URI` in each `backend/services/*/.env`, using a separate database name per service, and run `npm run dev:services` plus `npm --prefix frontend run dev`.

### Run one service

Each service runs on its own; it needs MongoDB (`npm run dev:db` starts one) and its `.env` from `npm run setup`.

```bash
npm run dev:db                                    # local MongoDB, if it isn't running
npm --prefix backend/services/menu run dev        # menu-service on :4102 (restaurant :4101, order :4103)
npm --prefix backend/services/menu test           # just that service's tests
npm --prefix frontend run dev                     # the frontend on :3400, against whatever services are up
```

### Run all the tests and checks

These are the same commands CI runs:

| Command | What it runs |
|---|---|
| `npm run check` | everything below except e2e, in order: format, lint, typecheck, import boundaries, tests |
| `npm test` | backend tests (each service and `@vmenu/common`: Vitest, Supertest, in-memory MongoDB), frontend tests (Vitest, Testing Library, MSW) and the repo checks |
| `npm run test:e2e` | Playwright against a running stack (`npm run dev` and `npm run seed` first) |
| `npm run lint` | ESLint on the frontend |
| `npm run typecheck` | TypeScript for the backend workspace and the frontend |
| `npm run deps` | import boundaries (dependency-cruiser, rules in `.dependency-cruiser.cjs`): no service imports another, routes don't reach models, packages don't import services, the frontend imports only `@vmenu/contracts` from the backend, and features don't import each other |
| `npm run format` / `format:check` | Prettier (settings in `.prettierrc.json`, `.editorconfig` for editors) |
| `npm run test:repo` | the issue forms, the PR template and repo hygiene (no `.DS_Store`, root scripts, formatting commit listed in `.git-blame-ignore-revs`) |

To hide the formatting commit from `git blame` locally: `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

### Environment

Each service reads its own `backend/services/<name>/.env` (see its `.env.example`):

| Variable | Used by | Notes |
| --- | --- | --- |
| `PORT` | all | 4101 / 4102 / 4103 |
| `MONGODB_URI` | all | this service's own database |
| `JWT_SECRET` | all | same value everywhere, 32+ characters |
| `INTERNAL_API_KEY` | all | same value everywhere |
| `FIREBASE_PROJECT_ID` | restaurant | the project whose ID tokens are accepted |
| `COOKIE_SECURE` | restaurant | `false` only for plain-http hosts other than localhost |
| `RESTAURANT_SERVICE_URL` | menu, order | |
| `MENU_SERVICE_URL` | order | |

The frontend only needs the public Firebase web config, plus the three service URLs if they are not on the defaults.

## Security changes in this refactor

- Removed the database password and JWT secret from the source code. Secrets now live only in `.env` files, which git ignores.
- Sign-in verifies the Firebase ID token instead of trusting a `uid` sent by the browser.
- Every route checks the role and the restaurant. Previously, any logged-in user could edit any restaurant.
- Order prices come from menu-service, not the cart.
- Mongoose `sanitizeFilter` strips `$` operators from user input. Bodies are whitelisted field by field.
- `helmet` headers, a 100 kB body limit, rate limiting on `/api/auth`, and a 5-second timeout on calls between services.
- The firebase-admin service-account key is no longer used. Any old key should be revoked in the Firebase console.

## Security checks in the pipeline

| Check | When | Fails on |
|---|---|---|
| `npm audit --audit-level=high` | every PR (ci.yml) | a high or critical advisory |
| Semgrep (`p/typescript`, `p/nodejs`, `p/react`) | every PR, and pushes to staging and main (code-scanning.yml) | a new high finding in the PR (results also in the Security tab) |
| GitGuardian | every PR | a committed secret |
| Trivy | each image build (release.yml) | a fixable HIGH or CRITICAL CVE |
| OWASP ZAP baseline (passive) | after each staging deploy (deploy.yml) | a High alert not listed in `.zap/known-high.txt` (report kept as the `zap-baseline` artifact) |

Each one writes a "Security" section in its job summary (`scripts/security-summary.mjs`). Secret scanning push protection is on for the repository.

## Layout

The services import their shared code from `@vmenu/common` (`backend/packages/common`), so a fix there applies to all three. `npm run dev`, `build`, `typecheck`, `test` and `seed` in a service first compile `@vmenu/common` to `dist/`. The service images build with `backend/` as the context: `docker build -f backend/services/menu/Dockerfile backend`.

```
frontend/                    Next.js app (no database access)
  src/app/                   routes only: each page.tsx renders one feature component
  src/features/<area>/       customer, kitchen, cashier, owner, staff, auth: components and logic
  src/features/restaurant/   screen parts the owner and cashier share (tables, menu, overview), role by props
  src/components/ui/         the UI kit: Button, Card, Chip, Input, Modal, Skeleton, ToastHost (see /ui-kit)
  src/components/layout/     DashboardHeader, MobileSidebar
  src/components/qr/         table QR codes and the printable sheet
  src/components/marketing/  landing page and tour
  src/lib/                   API client, Firebase, dates, shared types
  src/theme/deep-lab.css     design tokens
backend/                     one npm workspace with one package-lock.json (npm install here installs all of it)
  packages/
    common/                  @vmenu/common: server setup, errors, logger, metrics, auth, internal calls, config
  services/
    restaurant/              restaurant-service: src/app.ts routes, src/models.ts
    menu/                    menu-service
    order/                   order-service, in layers (CL-04): src/routes (HTTP only) -> src/services (rules)
                             -> src/repositories (MongoDB) -> src/models; src/clients: its calls to the other two
e2e/                         Playwright end-to-end tests (frontend and services together)
infra/
  compose/                   docker-compose.yml (local stack), docker-compose.prod.yml (server)
  deploy/                    server setup and deploy scripts (see infra/deploy/README.md)
  monitoring/                Grafana Alloy agent, dashboards and alerts (see infra/monitoring/README.md)
scripts/                     setup, local MongoDB, smoke test and repo checks
docs/showcase/               before/after screenshots for each PR (capture.ts)
.github/                     CI and deploy workflows, Dependabot, issue forms, PR template
```

Photo credits for the tour images are in `frontend/public/images/tour/CREDITS.md`.
