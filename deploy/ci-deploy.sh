#!/usr/bin/env bash
# SC2029: remote commands are built on this side on purpose (every value is validated first).
# SC2153: SSH_HOST and the other inputs come from the environment.
# shellcheck disable=SC2029,SC2153
# V-Menu: the GitHub Actions side of a deploy. Runs ON the runner, called by
# .github/workflows/deploy.yml (and by deploy-test.yml against a throwaway runner).
#
# It writes the server's env files from GitHub secrets, copies them with the compose
# files to /srv/vmenu/<target>/ over SSH, then runs remote-deploy.sh there.
# Nobody edits files on the server by hand.
#
# Inputs, all as environment variables:
#   TARGET            staging | prod
#   DEPLOY_ACTION     an image tag (sha-1a2b3c4, 1.2.0), --rollback or --seed
#   EXPECTED_SHA      optional: full git sha every /version must report
#   SSH_HOST SSH_USER SSH_KEY        secrets; SSH_PORT (default 22)
#   SSH_KNOWN_HOSTS   optional secret: the server's host key line(s). Recommended.
#   MONGODB_URI_RESTAURANT MONGODB_URI_MENU MONGODB_URI_ORDER JWT_SECRET INTERNAL_API_KEY
#   FIREBASE_PROJECT_ID LOG_LEVEL FRONTEND_PORT MONGO_MODE MONGO_NETWORK   (variables)
#   VMENU_SKIP_PULL   1 only in the CI test (images are built on the host)
set -Eeuo pipefail

die() { echo "::error::$*" >&2; exit 1; }

case ${TARGET:-} in staging | prod) ;; *) die "TARGET must be staging or prod" ;; esac
ACTION=${DEPLOY_ACTION:-}
[[ $ACTION =~ ^(--rollback|--seed|[A-Za-z0-9._-]{1,128})$ ]] || die "invalid DEPLOY_ACTION: '$ACTION'"
[[ -z ${EXPECTED_SHA:-} || $EXPECTED_SHA =~ ^[0-9a-f]{7,40}$ ]] || die "invalid EXPECTED_SHA"

: "${SSH_PORT:=22}"
: "${LOG_LEVEL:=info}"
: "${MONGO_MODE:=host}"
: "${MONGO_NETWORK:=}"
: "${FIREBASE_PROJECT_ID:=}"
if [[ -z ${FRONTEND_PORT:-} ]]; then
    if [[ $TARGET == prod ]]; then FRONTEND_PORT=3400; else FRONTEND_PORT=3401; fi
fi
[[ $FRONTEND_PORT =~ ^[0-9]{2,5}$ ]] || die "FRONTEND_PORT must be a port number"
[[ $SSH_PORT =~ ^[0-9]{1,5}$ ]] || die "SSH_PORT must be a port number"

# Not set up yet (no server secrets at all): skip, like M3's placeholder did, so releases on
# main stay green until Raksa adds the secrets. Partly set up is a mistake and fails below.
if [[ -z ${SSH_HOST:-}${SSH_USER:-}${SSH_KEY:-} ]]; then
    echo "::notice::No server configured for '$TARGET' yet (SSH_HOST/SSH_USER/SSH_KEY are empty). Skipping the deploy."
    if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
        echo "### ⏭️ $TARGET: skipped, no server configured yet (see deploy/README.md)" >>"$GITHUB_STEP_SUMMARY"
    fi
    exit 0
fi

# Fail early, by name, when a secret was never added to the GitHub Environment.
missing=()
for name in SSH_HOST SSH_USER SSH_KEY MONGODB_URI_RESTAURANT MONGODB_URI_MENU MONGODB_URI_ORDER JWT_SECRET INTERNAL_API_KEY; do
    [[ -n ${!name:-} ]] || missing+=("$name")
done
((${#missing[@]} == 0)) || die "missing secrets in the '$TARGET' environment: ${missing[*]}"

# The services refuse to start with a shorter one (services/*/src/lib/config.ts).
((${#JWT_SECRET} >= 32)) || die "JWT_SECRET in the '$TARGET' environment is ${#JWT_SECRET} characters; it must be at least 32 (openssl rand -hex 32)"

# Values are written single-quoted, so compose takes them literally ($ is not expanded).
# That only breaks on a single quote or a newline, so refuse those.
for name in MONGODB_URI_RESTAURANT MONGODB_URI_MENU MONGODB_URI_ORDER JWT_SECRET INTERNAL_API_KEY FIREBASE_PROJECT_ID LOG_LEVEL MONGO_NETWORK; do
    value=${!name}
    [[ $value != *"'"* && $value != *$'\n'* ]] || die "$name contains a single quote or a newline; change that value"
done

# ---- build the bundle the server gets ----
umask 077
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
bundle=$work/bundle
mkdir -p "$bundle"/services/{restaurant-service,menu-service,order-service}

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cp "$here/../docker-compose.prod.yml" "$here/compose.deploy.yml" "$here/compose.mongo-host.yml" \
    "$here/compose.mongo-container.yml" "$here/remote-deploy.sh" "$bundle/"

# TAG is added by remote-deploy.sh; it owns that line.
cat >"$bundle/.env" <<EOF
# Written by the deploy workflow. Do not edit on the server: the next deploy replaces it.
FRONTEND_PORT=$FRONTEND_PORT
MONGO_MODE=$MONGO_MODE
MONGO_NETWORK=$MONGO_NETWORK
EOF

common() {
    cat <<EOF
JWT_SECRET='$JWT_SECRET'
INTERNAL_API_KEY='$INTERNAL_API_KEY'
LOG_LEVEL='$LOG_LEVEL'
EOF
}
{
    echo "SERVICE_NAME=restaurant-service"
    echo "PORT=4101"
    echo "MONGODB_URI='$MONGODB_URI_RESTAURANT'"
    common
    echo "FIREBASE_PROJECT_ID='$FIREBASE_PROJECT_ID'"
    echo "COOKIE_SECURE=true"
} >"$bundle/services/restaurant-service/.env"
{
    echo "SERVICE_NAME=menu-service"
    echo "PORT=4102"
    echo "MONGODB_URI='$MONGODB_URI_MENU'"
    common
} >"$bundle/services/menu-service/.env"
{
    echo "SERVICE_NAME=order-service"
    echo "PORT=4103"
    echo "MONGODB_URI='$MONGODB_URI_ORDER'"
    common
} >"$bundle/services/order-service/.env"

# ---- SSH ----
key=$work/id_deploy
printf '%s\n' "$SSH_KEY" | tr -d '\r' >"$key"
chmod 600 "$key"
known=$work/known_hosts
if [[ -n ${SSH_KNOWN_HOSTS:-} ]]; then
    printf '%s\n' "$SSH_KNOWN_HOSTS" >"$known"
else
    echo "::warning::SSH_KNOWN_HOSTS is not set, trusting the server's key on first sight. Add it as a secret."
    ssh-keyscan -p "$SSH_PORT" -T 15 "$SSH_HOST" >"$known" 2>/dev/null || die "cannot reach $SSH_HOST:$SSH_PORT"
fi
ssh_opts=(-i "$key" -p "$SSH_PORT" -o UserKnownHostsFile="$known" -o StrictHostKeyChecking=yes
    -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15)
remote_dir=/srv/vmenu/$TARGET

echo "Copying compose and env files to $remote_dir"
tar -C "$bundle" -czf - . | ssh "${ssh_opts[@]}" "$SSH_USER@$SSH_HOST" "test -d '$remote_dir' && tar -xzf - -C '$remote_dir'" ||
    die "copy failed. Does $remote_dir exist and belong to $SSH_USER? (deploy/setup-server.sh creates it)"

echo "Running remote-deploy.sh $TARGET $ACTION"
log=$work/remote.log
set +e
ssh "${ssh_opts[@]}" "$SSH_USER@$SSH_HOST" \
    "EXPECTED_SHA='${EXPECTED_SHA:-}' VMENU_SKIP_PULL='${VMENU_SKIP_PULL:-0}' bash '$remote_dir/remote-deploy.sh' '$TARGET' '$ACTION'" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
set -e

# ---- job summary ----
if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
    line=$(grep '^RESULT ' "$log" | tail -n1 || true)
    {
        if ((status == 0)); then echo "### ✅ $TARGET: $ACTION"; else echo "### ❌ $TARGET: $ACTION failed"; fi
        echo
        if [[ -n $line ]]; then
            echo "| | |"
            echo "|---|---|"
            for kv in ${line#RESULT }; do echo "| ${kv%%=*} | \`${kv#*=}\` |"; done
        fi
        echo
        echo "<details><summary>Server log</summary>"
        echo
        echo '```'
        grep -v '^RESULT ' "$log" || true
        echo '```'
        echo "</details>"
    } >>"$GITHUB_STEP_SUMMARY"
fi

exit "$status"
