#!/usr/bin/env bash
# SEC-11: proves on a real MongoDB that each database user reaches only its own databases.
# Runs in CI's integration job, and locally with Docker:  bash scripts/check-db-isolation.sh
#
# It starts its own throwaway MongoDB with no network at all, creates the users from
# infra/deploy/mongo-users.js (the same roles as on the server) with random passwords, and
# removes it at the end. It can't reach any other database.
set -euo pipefail
cd "$(dirname "$0")/.."

name="vmenu-db-isolation-$$-$RANDOM"
admin_password=$(openssl rand -hex 16)
user_password=$(openssl rand -hex 16)
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT

docker run -d --name "$name" --network none \
    -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD="$admin_password" \
    -v "$PWD/infra/deploy/mongo-users.js:/check/mongo-users.js:ro" \
    mongo:7 --auth >/dev/null

shell() { docker exec "$name" mongosh --quiet -u admin -p "$admin_password" --authenticationDatabase admin "mongodb://127.0.0.1:27017/admin" "$@"; }
mode() { docker exec -e VMENU_USERS_MODE="$1" -e VMENU_THROWAWAY=1 -e VMENU_TEST_PASSWORD="$user_password" "$name" \
    mongosh --quiet -u admin -p "$admin_password" --authenticationDatabase admin "mongodb://127.0.0.1:27017/admin" --file /check/mongo-users.js; }

ready=""
for _ in $(seq 1 60); do
    if docker exec "$name" mongosh --quiet -u admin -p "$admin_password" --authenticationDatabase admin \
        "mongodb://127.0.0.1:27017/admin" --eval 'db.runCommand({ connectionStatus: 1 }).ok' >/dev/null 2>&1; then
        ready=yes
        break
    fi
    sleep 1
done
[[ -n $ready ]] || { echo "::error::the throwaway MongoDB did not start"; docker logs --tail 30 "$name"; exit 1; }

echo "--- creating users and test writes are refused without the throwaway flag"
if out=$(docker exec -e VMENU_USERS_MODE=create -e VMENU_TEST_PASSWORD="$user_password" "$name" \
    mongosh --quiet -u admin -p "$admin_password" --authenticationDatabase admin "mongodb://127.0.0.1:27017/admin" --file /check/mongo-users.js 2>&1); then
    echo "::error::create ran without VMENU_THROWAWAY=1"
    exit 1
fi
grep -q "only for the throwaway MongoDB" <<<"$out" || { echo "::error::create failed for another reason: $out"; exit 1; }
echo "refused"

echo "--- create the users, with the same roles as on the server"
mode create
echo "--- the roles are exactly as defined"
mode check
echo "--- each user reaches its own databases and not the other environment's"
mode isolation

# The checks must be able to fail: give staging one role too many and expect both to say so.
echo "--- a staging user with read on a production database must be caught"
shell --eval 'db.grantRolesToUser("vmenu_staging", [{ role: "read", db: "vmenu_prod_orders" }])' >/dev/null
# Each must fail for this reason, not because of some other error.
if out=$(mode check 2>&1); then
    echo "::error::the role check missed an over-broad user"
    exit 1
fi
grep -q "WRONG vmenu_staging: has a role it shouldn't: read on vmenu_prod_orders" <<<"$out" ||
    { echo "::error::the role check failed for another reason: $out"; exit 1; }
if out=$(mode isolation 2>&1); then
    echo "::error::the isolation check missed an over-broad user"
    exit 1
fi
grep -q "WRONG vmenu_staging can read vmenu_prod_orders" <<<"$out" ||
    { echo "::error::the isolation check failed for another reason: $out"; exit 1; }
echo "caught by both checks"
echo "database users are isolated"
