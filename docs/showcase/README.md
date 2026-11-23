# Before/after showcase (B11)

`before/` holds the state at tag `qa-baseline`; `after/` is filled once the QA tickets are merged.
Every picture is taken by `capture.ts`, never by hand, with the same viewport, data and theme in both phases.

## Re-run it

1. Start the stack with the demo data: `npm run dev`, then `npm run seed` (see the root README).
2. Capture:

   ```bash
   cd docs/showcase
   npm install
   npx playwright install chromium
   PHASE=after node capture.ts      # PHASE=before for the baseline
   ```

Staff screens need an app token, so the script signs one with the `JWT_SECRET` in `backend/services/restaurant/.env`. It only works against a stack you run yourself.

File names are `<ticket>-<screen>-<width>[-dark].png`. `capture-log.txt` lists every shot and any step that failed.
