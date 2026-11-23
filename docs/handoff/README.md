# QA run: report and handoff

_Updated 2026-11-23 21:23._

## Summary

- **Done:** 4 of 77 tickets (5%). Essential (P0 path): 4 of 14.
- **Working on now:** CL-08
- **Next essential tickets:** CL-08 -> CL-10 -> CL-09 -> VM-01 -> VM-02 -> SEC-05 -> VM-04 -> VM-05 -> VM-03 -> B11
- Every ticket's status, PR and issue: [remaining.md](remaining.md). Notes for each unfinished ticket: [tickets/](tickets/).

## Finished

The baseline capture (#62, the "before" screenshots and numbers) comes first, then:

| Ticket | Title | PR | CI |
|---|---|---|---|
| B9 | Issue and PR templates, GitHub issues for every ticket | [#135](https://github.com/RaksaOC/V-Menu/pull/135) | green |
| CL-01 | Group the repo into frontend/ and backend/ | [#136](https://github.com/RaksaOC/V-Menu/pull/136) | green |
| CL-02 | One shared backend library: @vmenu/common | [#139](https://github.com/RaksaOC/V-Menu/pull/139) | green |
| B1 | Frontend unit tests | [#140](https://github.com/RaksaOC/V-Menu/pull/140) | green |

All of these PRs are open and waiting for Raksa's review. Nothing is merged, so nothing is verified on staging yet.

## How to continue

**Merge order.** The PRs form a "train": each ticket's branch starts from the previous finished ticket's branch, so later PRs include the earlier commits. Review and merge them **in order**: #62, then the table above top to bottom. Each PR body has a compare link that shows only its own changes.

**Starting the next ticket.** Branch from the newest finished ticket branch, merge `origin/staging` in, then follow that ticket's notes in [tickets/](tickets/). When a ticket is done, its branch becomes the new starting point.

## Decisions made in this run

- **Branch prefix `cleanup/`, not `refactor/`,** for the CL tickets. The repo already has a branch named `refactor`, and git can't also have `refactor/...` branches.
- **Required CI check names are kept.** After CL-01 the audit jobs still report as `audit (services/restaurant-service)` and so on, because the staging ruleset requires those exact names. Renaming them needs a ruleset change by Raksa first.
- **Server paths are unchanged.** The server keeps `/srv/vmenu/<env>/services/<name>-service/.env`, and image names stay `ghcr.io/raksaoc/vmenu-<name>-service`.
- **No full frontend builds on the laptop** (they freeze it). CI builds the frontend; locally use typecheck, lint and unit tests.
- **Security details stay private.** Security tickets point to the private task document instead of describing the weakness, the same as their GitHub issues.
- **Every bug PR has a "Failing before the fix" run** (B2). The final review sweep checks it.

## Facts that save time

- Layout after CL-01: `frontend/` (Next.js 15, port 3400), `backend/services/{restaurant,menu,order}` (Express 5, Mongoose, Vitest, ports 4101-4103), `e2e/` (Playwright), `infra/{compose,deploy,monitoring}`, `scripts/`.
- Local stack without Docker: `npm run dev` (local MongoDB on 127.0.0.1:27017 through `scripts/dev-db.mjs`) and `npm run seed`.
- Tests at the baseline: restaurant 11, menu 9, order 8, frontend 0. Service coverage about 77-79% lines, with a 70% minimum.
- Required checks on `staging`: `test`, `integration`, `e2e`, and the 4 `audit (...)` jobs. PRs need 1 code-owner approval (Raksa).
- `npm install` can drop unrelated lockfile entries. Check `git diff --stat -- '*package-lock.json'` before committing.
- Windows PowerShell 5.1 breaks `gh pr create --body "..."` when the text has quotes. Use `--body-file`.
- The staging server is small and shared. Keep checks against it light.