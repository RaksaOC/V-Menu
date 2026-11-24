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
      -e "s|^FIREBASE_PROJECT_ID=.*|FIREBASE_PROJECT_ID=demo-vmenu|" \
      -e "s|^COOKIE_SECURE=.*|COOKIE_SECURE=false|" \
      -e "s|^ALLOW_TABLE_NAME_LINKS=.*|ALLOW_TABLE_NAME_LINKS=true|" \
      -e "s|^ORDERS_PER_MINUTE=.*|ORDERS_PER_MINUTE=100000|" \
      -e "s|^ORDERS_PER_TABLE=.*|ORDERS_PER_TABLE=100000|" \
      "backend/services/${svc}/.env.example" > "backend/services/${svc}/.env"
done
# B6: restaurant-service checks sign-ins with the Auth emulator (compose's e2e profile). A demo-
# project can never be a real one.
cat >> backend/services/restaurant/.env <<'ENV'
E2E=1
FIREBASE_AUTH_EMULATOR_HOST=auth-emulator:9099
ENV

# Root .env feeds the frontend build args. Firebase needs a non-empty config to build; staff
# sign-ins go to the Auth emulator (B6), so the API key is never checked.
sed -e "s|^NEXT_PUBLIC_FIREBASE_API_KEY=.*|NEXT_PUBLIC_FIREBASE_API_KEY=ci-dummy-api-key|" \
    -e "s|^NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=.*|NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ci-dummy.firebaseapp.com|" \
    -e "s|^NEXT_PUBLIC_FIREBASE_PROJECT_ID=.*|NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-vmenu|" \
    -e "s|^NEXT_PUBLIC_FIREBASE_APP_ID=.*|NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000|" \
    .env.example > .env
printf 'NEXT_PUBLIC_E2E=1\nNEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099\n' >> .env
# PHOTOS-S3: compose's MinIO publishes its S3 port here; the browser in the e2e job uploads photos
# to it and loads them from it (menu-service's S3_* settings come from the compose file).
printf 'S3_PORT=9400\n' >> .env

echo "wrote CI .env files (dummy secrets)"
