#!/usr/bin/env bash
# V-Menu: deploy one environment. Runs ON the server.
#
# The deploy workflow copies this file, the compose files and the env files into
# /srv/vmenu/<env>/ and calls it over SSH. Nobody needs to run it by hand.
#
#   remote-deploy.sh <staging|prod> <tag>         deploy an image tag (sha-1a2b3c4, 1.2.0)
#   remote-deploy.sh <staging|prod> --rollback    go back to the previous tag
#   remote-deploy.sh staging --seed               load the demo restaurant (staging only)
#
# Environment:
#   EXPECTED_SHA=<full git sha>  fail unless every service's /version reports this commit
#   COMMIT_TIME=<unix time>      average commit time of this deploy, for the DORA lead time
#   VMENU_SKIP_PULL=1            use images already on the host (the CI test only)
set -Eeuo pipefail

ENV_NAME=${1:-}
ACTION=${2:-}
EXPECTED_SHA=${EXPECTED_SHA:-}
COMMIT_TIME=${COMMIT_TIME:-}
ROOT=${VMENU_ROOT:-/srv/vmenu}
DIR=$ROOT/$ENV_NAME
STACK=$DIR/.tag_stack          # every successful tag, newest last
HISTORY=$DIR/deploy-history.log  # time, action, tag, result, seconds (for DORA metrics)
SERVICES=(restaurant-service:4101 menu-service:4102 order-service:4103)
START=$(date +%s)

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

case $ENV_NAME in staging | prod) ;; *) die "environment must be staging or prod" ;; esac
[[ -n $ACTION ]] || die "missing tag (or --rollback / --seed)"
cd "$DIR" 2>/dev/null || die "$DIR does not exist; run infra/deploy/setup-server.sh first"
[[ -f .env ]] || die "$DIR/.env is missing; the deploy workflow writes it"

# One deploy per environment at a time.
exec 9>"$DIR/.deploy.lock"
flock -w 300 9 || die "another deploy to $ENV_NAME is still running"

chmod 600 .env services/*/.env 2>/dev/null || true

# Value of a key in .env, or nothing (a missing key must not stop the script).
env_value() { { grep -E "^$1=" .env || true; } | tail -n1 | cut -d= -f2- | tr -d "'\""; }
FRONTEND_PORT=$(env_value FRONTEND_PORT)
MONGO_MODE=$(env_value MONGO_MODE)
[[ -n $FRONTEND_PORT ]] || die "FRONTEND_PORT is not set in .env"

files=(-f docker-compose.prod.yml -f compose.deploy.yml)
case ${MONGO_MODE:-host} in
    host) files+=(-f compose.mongo-host.yml) ;;
    container) files+=(-f compose.mongo-container.yml) ;;
    none) ;;
    *) die "MONGO_MODE must be host, container or none" ;;
esac
# Behind a reverse proxy that runs in Docker (Traefik etc.): the frontend joins its network.
if [[ -n $(env_value PROXY_NETWORK) ]]; then files+=(-f compose.proxy-network.yml); fi
compose() { docker compose --project-name "vmenu-$ENV_NAME" "${files[@]}" "$@"; }

current_tag() { if [[ -s $STACK ]]; then tail -n1 "$STACK"; fi; }
previous_tag() { if [[ -s $STACK ]]; then awk '{l[NR]=$0} END {if (NR >= 2) print l[NR-1]}' "$STACK"; fi; }
write_markers() {
    current_tag >.current_tag
    previous_tag >.previous_tag
    # keep the last 20 tags
    if [[ $(wc -l <"$STACK") -gt 20 ]]; then tail -n20 "$STACK" >"$STACK.tmp" && mv "$STACK.tmp" "$STACK"; fi
}
set_tag() {
    sed -i '/^TAG=/d' .env
    printf 'TAG=%s\n' "$1" >>.env
}
record() { printf '%s\t%s\t%s\t%s\t%ss\n' "$(date -u +%FT%TZ)" "$1" "$2" "$3" "$(($(date +%s) - START))" >>"$HISTORY"; }
# DORA lead time: one more history line in the same format, with the seconds from commit to live.
record_lead_time() {
    [[ $COMMIT_TIME =~ ^[0-9]{9,11}$ ]] || return 0
    local lead=$(($(date +%s) - COMMIT_TIME))
    ((lead >= 0)) || return 0
    printf '%s\tlead-time\t%s\tok\t%ss\n' "$(date -u +%FT%TZ)" "$1" "$lead" >>"$HISTORY"
}
result() { printf 'RESULT env=%s action=%s tag=%s previous=%s seconds=%s\n' "$ENV_NAME" "$1" "$2" "$(previous_tag)" "$(($(date +%s) - START))"; }

smoke_test() {
    local failed=0 svc name port body version _
    for svc in "${SERVICES[@]}"; do
        name=${svc%%:*}
        port=${svc##*:}
        if ! body=$(compose exec -T "$name" wget -qO- "http://127.0.0.1:$port/ready" 2>&1); then
            log "  FAIL $name /ready: $body"
            failed=1
            continue
        fi
        if ! body=$(compose exec -T "$name" wget -qO- "http://127.0.0.1:$port/version" 2>&1); then
            log "  FAIL $name /version: $body"
            failed=1
            continue
        fi
        version=$(sed -n 's/.*"version":"\([^"]*\)".*/\1/p' <<<"$body")
        if [[ -n $EXPECTED_SHA && $version != "$EXPECTED_SHA" ]]; then
            log "  FAIL $name runs ${version:-unknown}, expected $EXPECTED_SHA"
            failed=1
            continue
        fi
        log "  ok   $name (version ${version:0:12})"
    done
    for _ in 1 2 3 4 5 6; do
        if curl -fsS -o /dev/null --max-time 10 "http://127.0.0.1:$FRONTEND_PORT/"; then
            log "  ok   frontend (127.0.0.1:$FRONTEND_PORT)"
            return $failed
        fi
        sleep 5
    done
    log "  FAIL frontend does not answer on 127.0.0.1:$FRONTEND_PORT"
    return 1
}

# Bring the whole stack up on one tag. Returns non-zero on any failure.
#   run_tag <tag>        pull the tag from GHCR first (a normal deploy)
#   run_tag <tag> local  going back to a tag that already ran here: use the images on the
#                        server, and download only missing ones. Faster, and safe even if the
#                        tag was pushed again in GHCR since (a re-run release rebuilds it).
run_tag() {
    set_tag "$1"
    if [[ ${VMENU_SKIP_PULL:-0} == 1 ]]; then
        :
    elif [[ ${2:-} == local ]]; then
        log "using the images already on the server for $1 (missing ones are downloaded)"
    else
        log "pulling images for $1"
        compose pull --quiet || return 1
    fi
    log "starting containers"
    compose up -d --remove-orphans --pull missing --wait --wait-timeout 300 || {
        show_failure
        return 1
    }
    log "smoke test"
    smoke_test || {
        show_failure
        return 1
    }
}

# So the reason shows up in the GitHub Actions log, without logging into the server.
show_failure() {
    compose ps -a || true
    log "last log lines of each service:"
    compose logs --no-color --tail 25 restaurant-service menu-service order-service frontend 2>&1 || true
}

prune_old_images() {
    # Only V-Menu images, only unused ones, only older than 14 days.
    docker image prune -af --filter "until=336h" \
        --filter "label=org.opencontainers.image.source=https://github.com/RaksaOC/V-Menu" >/dev/null 2>&1 || true
}

case $ACTION in
    --seed)
        [[ $ENV_NAME == staging ]] || die "seed runs on staging only"
        log "seeding demo data"
        compose exec -T restaurant-service node dist/seed.js
        compose exec -T menu-service node dist/seed.js
        record seed "$(current_tag)" ok
        result seed "$(current_tag)"
        ;;

    --rollback)
        from=$(current_tag)
        target=$(previous_tag)
        [[ -n $target ]] || die "no previous version recorded for $ENV_NAME"
        log "rolling back $ENV_NAME: $from -> $target"
        EXPECTED_SHA="" # that tag already passed its checks when it was deployed
        if run_tag "$target" local; then
            sed -i '$d' "$STACK"
            write_markers
            record rollback "$target" ok
            log "rolled back to $target"
            result rollback "$target"
        else
            record rollback "$target" failed
            die "rollback failed. Check: docker compose -p vmenu-$ENV_NAME ps"
        fi
        ;;

    -*) die "unknown option $ACTION" ;;

    *)
        [[ $ACTION =~ ^[A-Za-z0-9._-]{1,128}$ ]] || die "invalid tag: $ACTION"
        from=$(current_tag)
        log "deploying $ACTION to $ENV_NAME (was: ${from:-nothing})"
        if run_tag "$ACTION"; then
            [[ $ACTION == "$from" ]] || echo "$ACTION" >>"$STACK"
            write_markers
            record deploy "$ACTION" ok
            [[ $ACTION == "$from" ]] || record_lead_time "$ACTION"
            prune_old_images
            log "deployed $ACTION"
            result deploy "$ACTION"
        else
            record deploy "$ACTION" failed
            if [[ -n $from && $from != "$ACTION" ]]; then
                log "deploy failed, putting $from back"
                EXPECTED_SHA=""
                if run_tag "$from" local; then
                    record auto-rollback "$from" ok
                    log "back on $from"
                else
                    record auto-rollback "$from" failed
                    log "could not restore $from either"
                fi
            fi
            die "deploy of $ACTION to $ENV_NAME failed"
        fi
        ;;
esac
