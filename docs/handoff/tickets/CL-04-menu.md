# CL-04-menu - Clean layers inside menu-service

- **Priority:** P1
- **Status:** not started
- **Issue:** [#102](https://github.com/RaksaOC/V-Menu/issues/102)
- **Branch to create:** `cleanup/CL-04-menu-layers`

## What to do

The full ticket (problem, what to change, tests, done when) is in issue [#102](https://github.com/RaksaOC/V-Menu/issues/102).

## Depends on

- CL-02 : completed [#139](https://github.com/RaksaOC/V-Menu/pull/139)

## Notes from this run

- nothing beyond the issue yet

## How to start

1. `git fetch origin`, then branch from the newest finished ticket branch (the "train head", see [../README.md](../README.md#how-to-continue)), and merge `origin/staging` in.
2. Paths in the spec and issues are from before CL-01. `services/<name>-service` is now `backend/services/<name>`; `deploy/`, `monitoring/` and the compose files are under `infra/`.
3. Failing test first (its own commit), then the fix, with the ticket ID in every commit message.
4. Open the PR into `staging` using the PR template, with the "Failing before the fix" output and a compare link that shows only this ticket's changes.