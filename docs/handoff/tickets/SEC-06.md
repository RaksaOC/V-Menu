# SEC-06 - Security: how rate limits identify visitors (details private)

- **Priority:** P1
- **Status:** not started
- **Issue:** [#118](https://github.com/RaksaOC/V-Menu/issues/118)
- **Branch to create:** `fix/SEC-06-trust-proxy`

## What to do

Security ticket. The details are kept out of the public repo on purpose: read them in the private task document (section 5) or ask Visal.

## Depends on

- CL-02 : in progress 

## Notes from this run

- nothing beyond the issue yet

## How to start

1. `git fetch origin`, then branch from the newest finished ticket branch (the "train head", see [../README.md](../README.md#how-to-continue)), and merge `origin/staging` in.
2. Paths in the spec and issues are from before CL-01. `services/<name>-service` is now `backend/services/<name>`; `deploy/`, `monitoring/` and the compose files are under `infra/`.
3. Failing test first (its own commit), then the fix, with the ticket ID in every commit message.
4. Open the PR into `staging` using the PR template, with the "Failing before the fix" output and a compare link that shows only this ticket's changes.