# SEC-02 - The web pages send no security headers

- **Priority:** P1
- **Status:** not started
- **Issue:** [#114](https://github.com/RaksaOC/V-Menu/issues/114)
- **Branch to create:** `fix/SEC-02-security-headers`

## What to do

The full ticket (problem, what to change, tests, done when) is in issue [#114](https://github.com/RaksaOC/V-Menu/issues/114).

## Depends on

- CL-01 : in progress 

## Notes from this run

- nothing beyond the issue yet

## How to start

1. `git fetch origin`, then branch from the newest finished ticket branch (the "train head", see [../README.md](../README.md#how-to-continue)), and merge `origin/staging` in.
2. Paths in the spec and issues are from before CL-01. `services/<name>-service` is now `backend/services/<name>`; `deploy/`, `monitoring/` and the compose files are under `infra/`.
3. Failing test first (its own commit), then the fix, with the ticket ID in every commit message.
4. Open the PR into `staging` using the PR template, with the "Failing before the fix" output and a compare link that shows only this ticket's changes.