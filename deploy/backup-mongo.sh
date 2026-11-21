#!/usr/bin/env bash
# V-Menu: back up every MongoDB database to one gzipped archive, keep KEEP_DAYS days.
# Installed as /usr/local/bin/vmenu-backup by setup-server.sh and run by cron as root.
# Settings: /etc/vmenu/backup.env
#
# Restore (example, whole archive):
#   docker run --rm -i --network host mongo:7 \
#     mongorestore --uri="$MONGO_BACKUP_URI" --archive --gzip --drop < /srv/vmenu/backups/<file>
# Restore one database only: add --nsInclude='vmenu_staging_orders.*'
set -Eeuo pipefail

CONF=${VMENU_BACKUP_CONF:-/etc/vmenu/backup.env}
# shellcheck source=/dev/null
. "$CONF"

if [[ -z ${MONGO_BACKUP_URI:-} ]]; then
    echo "$(date -u +%FT%TZ) backup skipped: MONGO_BACKUP_URI is empty in $CONF"
    exit 0
fi
BACKUP_DIR=${BACKUP_DIR:-/srv/vmenu/backups}
KEEP_DAYS=${KEEP_DAYS:-7}
case ${MONGO_MODE:-host} in
    container) network=${MONGO_NETWORK:?MONGO_NETWORK is empty in $CONF} ;;
    *) network=host ;;
esac

mkdir -p "$BACKUP_DIR"
out=$BACKUP_DIR/vmenu-$(date -u +%Y%m%d-%H%M).archive.gz

# The URI (with its password) goes in a root-only config file, not on the command line.
cfg=$(mktemp)
trap 'rm -f "$cfg" "$out.part"' EXIT
chmod 600 "$cfg"
printf 'uri: "%s"\n' "$MONGO_BACKUP_URI" >"$cfg"

# Run mongodump directly as root: the config file is root-only (it holds the password), and
# the image's entrypoint would otherwise run the tool as the mongodb user.
docker run --rm --network "$network" --user 0:0 --entrypoint mongodump \
    -v "$cfg:/backup.yaml:ro" mongo:7 --config=/backup.yaml --archive --gzip --quiet >"$out.part"
mv "$out.part" "$out"
chmod 600 "$out"

find "$BACKUP_DIR" -name 'vmenu-*.archive.gz' -mtime "+$KEEP_DAYS" -delete
echo "$(date -u +%FT%TZ) backup ok: $out ($(du -h "$out" | cut -f1))"
