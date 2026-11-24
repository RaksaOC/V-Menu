#!/usr/bin/env bash
# SC2153: SSH_HOST and the other inputs come from the environment.
# shellcheck disable=SC2153
# V-Menu monitoring: the GitHub Actions side of a deploy, called by
# .github/workflows/monitoring.yml. It follows the same pattern as infra/deploy/ci-deploy.sh:
# write the env file from GitHub secrets, copy the files over SSH, start them there.
#
# Inputs, all as environment variables:
#   SSH_HOST SSH_USER SSH_KEY   secrets; SSH_PORT (default 22)
#   SSH_KNOWN_HOSTS             optional secret: the server's host key line(s). Recommended.
#   GRAFANA_PROM_URL GRAFANA_PROM_USER GRAFANA_LOKI_URL GRAFANA_LOKI_USER GRAFANA_CLOUD_TOKEN
#   MONITORING_DIR              default /srv/monitoring
set -Eeuo pipefail

die() { echo "::error::$*" >&2; exit 1; }

: "${SSH_PORT:=22}"
: "${MONITORING_DIR:=/srv/monitoring}"
[[ $SSH_PORT =~ ^[0-9]{1,5}$ ]] || die "SSH_PORT must be a port number"
[[ $MONITORING_DIR =~ ^/[A-Za-z0-9/_.-]+$ ]] || die "invalid MONITORING_DIR"

grafana=(GRAFANA_PROM_URL GRAFANA_PROM_USER GRAFANA_LOKI_URL GRAFANA_LOKI_USER GRAFANA_CLOUD_TOKEN)

# Not set up yet: skip, so the workflow stays green until the secrets are added.
if [[ -z ${SSH_HOST:-}${SSH_USER:-}${SSH_KEY:-} || -z ${GRAFANA_CLOUD_TOKEN:-} ]]; then
    echo "::notice::Monitoring is not configured yet (SSH or Grafana secrets are empty). Skipping the deploy."
    exit 0
fi

missing=()
for name in SSH_HOST SSH_USER SSH_KEY "${grafana[@]}"; do
    [[ -n ${!name:-} ]] || missing+=("$name")
done
((${#missing[@]} == 0)) || die "missing secrets in the 'staging' environment: ${missing[*]}"

# Values are written single-quoted, so compose takes them literally.
for name in "${grafana[@]}"; do
    value=${!name}
    [[ $value != *"'"* && $value != *$'\n'* ]] || die "$name contains a single quote or a newline; change that value"
done

umask 077
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
bundle=$work/bundle
mkdir -p "$bundle"

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cp "$here/compose.yml" "$here/compose.server.yml" "$here/config.alloy" "$here/docker-api.cfg" "$here/container-stats.mjs" "$bundle/"

{
    echo "# Written by the monitoring workflow. Do not edit on the server: the next deploy replaces it."
    echo "MONITOR_HOST=server"
    for name in "${grafana[@]}"; do echo "$name='${!name}'"; done
} >"$bundle/.env"

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

echo "Copying the monitoring files to $MONITORING_DIR"
# shellcheck disable=SC2029  # MONITORING_DIR is validated above
tar -C "$bundle" -czf - . | ssh "${ssh_opts[@]}" "$SSH_USER@$SSH_HOST" "test -d '$MONITORING_DIR' && tar -xzf - -C '$MONITORING_DIR'" ||
    die "copy failed. Does $MONITORING_DIR exist and belong to $SSH_USER? (see infra/monitoring/README.md)"

echo "Starting the monitoring agent"
# shellcheck disable=SC2029  # MONITORING_DIR is validated above
ssh "${ssh_opts[@]}" "$SSH_USER@$SSH_HOST" "MONITORING_DIR='$MONITORING_DIR' bash -s" <<'REMOTE'
set -Eeuo pipefail
cd "$MONITORING_DIR"

# The containers run unprivileged, so they need read access to their own config files.
chmod 600 .env
chmod 644 compose.yml compose.server.yml config.alloy docker-api.cfg container-stats.mjs

for env in staging prod; do
    if ! docker network inspect "vmenu-${env}_frontend" >/dev/null 2>&1; then
        echo "The network vmenu-${env}_frontend does not exist. Deploy $env first." >&2
        exit 1
    fi
    # Must exist first, or Docker would create a directory in its place.
    history="/srv/vmenu/$env/deploy-history.log"
    touch "$history"
    chmod 644 "$history"
done

compose() { docker compose -f compose.yml -f compose.server.yml "$@"; }
compose pull --quiet
# Recreate, because a changed config file is not picked up by a running container.
if ! compose up -d --force-recreate --remove-orphans --wait --wait-timeout 120; then
    compose ps -a || true
    compose logs --no-color --tail 30 || true
    exit 1
fi
compose ps
REMOTE

if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
    echo "### ✅ Monitoring agent deployed to $MONITORING_DIR" >>"$GITHUB_STEP_SUMMARY"
fi
