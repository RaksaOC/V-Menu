#!/usr/bin/env bash
# B5: runs the screenshot tests (tests/screens.spec.ts) on Linux, in the Playwright image, so the
# pictures match the ones CI takes. Needs a running stack on this machine: set BASE_URL to it
# (default http://localhost:3400). Extra arguments go to `playwright test`, for example
# --update-snapshots. RECORD_SCREENS=1 records the screens' data again too.
set -euo pipefail
cd "$(dirname "$0")/../.."
version=$(node -p "require('./e2e/node_modules/@playwright/test/package.json').version")
base=${BASE_URL:-http://localhost:3400}
# inside the container, the host's localhost is host.docker.internal
base=${base/localhost/host.docker.internal}
base=${base/127.0.0.1/host.docker.internal}
exec docker run --rm --ipc=host --add-host=host.docker.internal:host-gateway \
    -v "$PWD:/repo" -w /repo/e2e \
    -e BASE_URL="$base" -e RECORD_SCREENS="${RECORD_SCREENS:-}" -e CI="${CI:-}" \
    "mcr.microsoft.com/playwright:v${version}-noble" \
    npx playwright test tests/screens.spec.ts --project=chromium "$@"
