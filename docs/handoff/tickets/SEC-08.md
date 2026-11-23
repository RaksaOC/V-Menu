# SEC-08 - Harden both Firebase projects

- **Priority:** P1
- **Status:** not started
- **Issue:** -
- **Branch to create:** `fix/SEC-08-firebase-hardening`

## What to do

The full ticket (problem, what to change, tests, done when) is in issue -.

## Depends on

- CL-01 : completed [#136](https://github.com/RaksaOC/V-Menu/pull/136)

## Notes from this run

- Needs Firebase console access for v-menu-e9835 (production) and v-menu-staging. Prepare the checklist and code side; the console steps are for Raksa.

## How to start

1. `git fetch origin`, then branch from the newest finished ticket branch (the "train head", see [../README.md](../README.md#how-to-continue)), and merge `origin/staging` in.
2. Paths in the spec and issues are from before CL-01. `services/<name>-service` is now `backend/services/<name>`; `deploy/`, `monitoring/` and the compose files are under `infra/`.
3. Failing test first (its own commit), then the fix, with the ticket ID in every commit message.
4. Open the PR into `staging` using the PR template, with the "Failing before the fix" output and a compare link that shows only this ticket's changes.