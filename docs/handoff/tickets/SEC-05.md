# SEC-05 - Make the photo upload safe

- **Priority:** P0 (with VM-02) - **essential (P0 path)**
- **Status:** not started
- **Issue:** [#117](https://github.com/RaksaOC/V-Menu/issues/117)
- **Branch to create:** `fix/SEC-05-safe-uploads`

## What to do

The full ticket (problem, what to change, tests, done when) is in issue [#117](https://github.com/RaksaOC/V-Menu/issues/117).

## Depends on

- VM-02 : not started 

## Notes from this run

- nothing beyond the issue yet

## How to start

1. `git fetch origin`, then branch from the newest finished ticket branch (the "train head", see [../README.md](../README.md#how-to-continue)), and merge `origin/staging` in.
2. Paths in the spec and issues are from before CL-01. `services/<name>-service` is now `backend/services/<name>`; `deploy/`, `monitoring/` and the compose files are under `infra/`.
3. Failing test first (its own commit), then the fix, with the ticket ID in every commit message.
4. Open the PR into `staging` using the PR template, with the "Failing before the fix" output and a compare link that shows only this ticket's changes.