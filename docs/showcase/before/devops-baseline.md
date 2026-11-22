# DevOps baseline (before)

Captured 23 Nov 2026 at tag `qa-baseline` (`ca0eda9`, the production release of 22 Nov 2026; same tree as `staging` at `ee91fb2`).

## Tests

| Suite | Tests | Lines | Branches | Functions |
|---|---|---|---|---|
| restaurant-service (Vitest) | 11 | 79.2% | 52.0% | 68.6% |
| menu-service (Vitest) | 9 | 76.7% | 53.4% | 68.2% |
| order-service (Vitest) | 8 | 77.6% | 45.5% | 62.9% |
| frontend | **0 (no test runner)** | – | – | – |
| e2e (Playwright) | **1 spec** (`e2e/tests/customer-order.spec.ts`) | – | – | – |

Backend total: 28 tests in 3 files (one file per service). The task document says 13/10/9; the counts above are what `npm test` reports at the baseline.

## CI (latest `staging` run before any QA work)

Run [#75](https://github.com/RaksaOC/V-Menu/actions/runs/45027445970), 3 m 51 s, all green. Screenshot: `devops-ci-run.png`.

| Job | Result | Duration |
|---|---|---|
| test (restaurant-service) | success | 22 s |
| test (menu-service) | success | 14 s |
| test (order-service) | success | 27 s |
| test (frontend): typecheck, lint, build only | success | 70 s |
| audit × 4 (`npm audit --audit-level=high`) | success | 6–12 s |
| integration (Compose stack + smoke) | success | 48 s |
| e2e (1 Playwright spec) | success | 105 s |

No code scanning (CodeQL/Semgrep), no frontend unit tests, no backend lint, no coverage for the frontend, no post-deploy staging test.

## App findings confirmed while capturing

- VM-01: both "View QR Code" buttons do nothing (`VM-01-*-view-qr-click-1280.png`).
- VM-02: adding an item with a 1.2 MB JPEG returns **500 "Something went wrong"** (`VM-02-add-item-response.txt`). The base64 body is over the 100 kB JSON limit, and the error handler reports it as a 500, not the 400 the task document expects.
- VM-21: the customer header shows the slug `demo-bistro`, not "Demo Bistro".
- VM-07: after ordering, the page shows a toast and jumps back to the menu.
- Staff screens (kitchen, cashier, owner) render light even with the dark theme saved: `ThemeSync` limits dark mode to the landing and sign-in pages.
