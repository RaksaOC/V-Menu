<!-- Title: type(scope): TICKET-ID short summary, e.g. fix(order): VM-08 one open bill per table -->

## Ticket

<!-- The ticket ID and its issue. "Closes #N" closes the issue when this PR is merged. -->
Ticket: 
Closes #

## What changed

-

## Why

<!-- The problem, and any deviation from the ticket's suggested approach. -->

## Tests

<!-- What you ran locally and the result, e.g. `npm test` in services/order-service: 14 passed. -->

### Failing before the fix

<!-- Bugs: paste the output of the new test run against the old code. -->

```text

```

## Screenshots

<!-- UI changes: light and dark, and phone width (360 px) for screens used on phones.
     Save them as docs/showcase/after/<ticket>-<screen>-<width>[-dark].png. Delete this section otherwise. -->

## Checklist

- [ ] Ticket ID in the PR title and in every commit message
- [ ] Test added that fails without the fix (bugs: failing run pasted above)
- [ ] Screenshots for UI changes, in light and dark (or not a UI change)
- [ ] New routes added to the access-control test matrix (or no new routes)
- [ ] Tests, typecheck and lint pass locally, and CI is green
- [ ] Checked on staging after the merge (tick after the auto-deploy)
