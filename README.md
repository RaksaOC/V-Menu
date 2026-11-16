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
4. restaurant-service issues a 1-hour **app token** (HS256 JWT) holding `uid`, `role` and, for staff, `resId`. It goes in an httpOnly cookie and in the response body.
5. Every service checks the role, and checks that the token's restaurant matches the one in the URL. Owners may only touch restaurants they own.

## Run it locally

Requires Node 20+.

```bash
npm install            # root tools (concurrently, local MongoDB)
npm run setup          # installs every package, writes services/*/.env with fresh shared secrets
cp frontend/.env.example frontend/.env.local   # then fill in your Firebase web config
npm run dev            # MongoDB + 3 services + frontend
```

Open http://localhost:3400. The landing page opens a short technical tour of the system.

- `npm run dev` starts a local MongoDB on `127.0.0.1:27017`, with data in `.data/mongo`. To use Atlas instead, set `MONGODB_URI` in each `services/*/.env`, using a separate database name per service, and run `npm run dev:services` plus `npm --prefix frontend run dev`.
- `npm test` runs each service's tests (Vitest, Supertest and an in-memory MongoDB).
- `npm run typecheck` type-checks all four packages.

### Environment

Each service reads its own `services/<name>/.env` (see its `.env.example`):

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

## Layout

```
frontend/                    Next.js app (pages only, no database access)
  src/components/tour/       landing-page tour
  src/theme/deep-lab.css     design tokens
services/
  restaurant-service/        src/app.ts routes, src/models.ts, src/lib/ shared helpers
  menu-service/
  order-service/
scripts/                     setup and local MongoDB
```

Photo credits for the tour images are in `frontend/public/images/tour/CREDITS.md`.
