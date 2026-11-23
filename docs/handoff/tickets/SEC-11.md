# SEC-11 - Check each database user can only reach its own databases

- **Priority:** P2
- **Status:** not started
- **Issue:** -
- **Branch to create:** `tests/SEC-11-db-user-isolation`

## What to do

The full ticket (problem, what to change, tests, done when) is in issue -.

## Depends on

- CL-01 : completed [#136](https://github.com/RaksaOC/V-Menu/pull/136)

## Notes from this run

- Needs the MongoDB users on the server. Prepare the check script; running it on the server is for Raksa.

## How to start

1. `git fetch origin`, then branch from the newest finished ticket branch (the "train head", see [../README.md](../README.md#how-to-continue)), and merge `origin/staging` in.
2. Paths in the spec and issues are from before CL-01. `services/<name>-service` is now `backend/services/<name>`; `deploy/`, `monitoring/` and the compose files are under `infra/`.
3. Failing test first (its own commit), then the fix, with the ticket ID in every commit message.
4. Open the PR into `staging` using the PR template, with the "Failing before the fix" output and a compare link that shows only this ticket's changes.