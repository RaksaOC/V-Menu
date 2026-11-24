#!/usr/bin/env bash
# CI only: makes every .env that docker compose needs from the committed .env.example files,
# with dummy secrets. Nothing here is real; the values only have to agree across services.
#   bash scripts/ci-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Never clobber a developer's real .env files: outside CI, stop if any already exist.
if [ -z "${CI:-}" ]; then
  for f in .env backend/services/*/.env; do
    if [ -e "$f" ]; then echo "refusing to overwrite $f outside CI (set CI=true to force)" >&2; exit 1; fi
  done
fi

JWT_SECRET="${JWT_SECRET:-ci-dummy-jwt-secret-ci-dummy-jwt-secret-0001}"
INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-dummy-internal-api-key-0001}"

for svc in restaurant menu order; do
  sed -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" \
      -e "s|^INTERNAL_API_KEY=.*|INTERNAL_API_KEY=${INTERNAL_API_KEY}|" \
      -e "s|^FIREBASE_PROJECT_ID=.*|FIREBASE_PROJECT_ID=ci-dummy|" \
      -e "s|^COOKIE_SECURE=.*|COOKIE_SECURE=false|" \
      "backend/services/${svc}/.env.example" > "backend/services/${svc}/.env"
done

# Root .env feeds the frontend build args. Firebase needs a non-empty config to build;
# the customer flow never signs in, so dummy values are enough.
sed -e "s|^NEXT_PUBLIC_FIREBASE_API_KEY=.*|NEXT_PUBLIC_FIREBASE_API_KEY=ci-dummy-api-key|" \
    -e "s|^NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=.*|NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ci-dummy.firebaseapp.com|" \
    -e "s|^NEXT_PUBLIC_FIREBASE_PROJECT_ID=.*|NEXT_PUBLIC_FIREBASE_PROJECT_ID=ci-dummy|" \
    -e "s|^NEXT_PUBLIC_FIREBASE_APP_ID=.*|NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000|" \
    .env.example > .env

echo "wrote CI .env files (dummy secrets)"
