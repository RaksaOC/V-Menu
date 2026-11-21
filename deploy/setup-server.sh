#!/usr/bin/env bash
# V-Menu: one-time server setup. Run it ONCE as root on the server, from a checkout of the repo:
#
#   sudo STAGING_HOST=staging.example.com PROD_HOST=example.com \
#        DEPLOY_PUBKEY="ssh-ed25519 AAAA... vmenu-deploy" \
#        MONGO_MODE=host bash deploy/setup-server.sh
#
# Safe to run again: every step checks what is already there.
#
# What it does
#   1. installs Docker (+ Compose plugin) if missing, and checks Compose is new enough
#   2. creates the "deploy" user, puts it in the docker group, adds the CI public key
#   3. creates /srv/vmenu/{staging,prod} and /srv/vmenu/backups, owned by deploy
#   4. firewall (ufw): allows SSH, 80 and 443 (see FIREWALL below)
#   5. Caddy as the HTTPS reverse proxy (skipped if something else owns ports 80/443)
#   6. a daily MongoDB backup (mongodump) with 7 days kept
#
# Settings (environment variables)
#   STAGING_HOST, PROD_HOST   public hostnames, e.g. staging.vmenu.example / vmenu.example,
#                             or 203.0.113.7.sslip.io style names when there is no domain
#   DEPLOY_PUBKEY             public half of the key pair whose private half is the SSH_KEY
#                             GitHub secret
#   DEPLOY_USER=deploy
#   STAGING_PORT=3401  PROD_PORT=3400    must match FRONTEND_PORT in each GitHub Environment
#   MONGO_MODE=host|container|none       how MongoDB runs on this server (see README)
#   MONGO_NETWORK                        MONGO_MODE=container: the Mongo container's network
#   SSH_PORT=22
#   FIREWALL=yes|no           yes (default): ufw allows SSH/80/443. If ufw is off and other
#                             public ports are in use, it stops and asks for FIREWALL_FORCE=yes.
set -Eeuo pipefail

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mWARNING: %s\033[0m\n' "$*"; }
die() { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root: sudo ... bash deploy/setup-server.sh"
command -v apt-get >/dev/null || die "this script supports Debian/Ubuntu (apt) only"

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
STAGING_HOST=${STAGING_HOST:?set STAGING_HOST}
PROD_HOST=${PROD_HOST:?set PROD_HOST}
DEPLOY_PUBKEY=${DEPLOY_PUBKEY:?set DEPLOY_PUBKEY to the CI public key}
DEPLOY_USER=${DEPLOY_USER:-deploy}
STAGING_PORT=${STAGING_PORT:-3401}
PROD_PORT=${PROD_PORT:-3400}
MONGO_MODE=${MONGO_MODE:-host}
MONGO_NETWORK=${MONGO_NETWORK:-}
SSH_PORT=${SSH_PORT:-22}
FIREWALL=${FIREWALL:-yes}
ROOT=/srv/vmenu

case $MONGO_MODE in host | container | none) ;; *) die "MONGO_MODE must be host, container or none" ;; esac
[[ $MONGO_MODE != container || -n $MONGO_NETWORK ]] || die "MONGO_MODE=container needs MONGO_NETWORK"
[[ $DEPLOY_PUBKEY =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-[a-z0-9-]+)\ [A-Za-z0-9+/=]+ ]] || die "DEPLOY_PUBKEY does not look like a public key"

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------- 1. Docker
log "1/6 Docker"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw cron >/dev/null
if ! command -v docker >/dev/null; then
    echo "installing Docker from get.docker.com"
    curl -fsSL https://get.docker.com | sh
else
    echo "Docker already installed: $(docker --version)"
fi
systemctl enable --now docker >/dev/null
compose_version=$(docker compose version --short 2>/dev/null || true)
[[ -n $compose_version ]] || die "the docker compose plugin is missing: apt-get install docker-compose-plugin"
lowest=$(printf '%s\n%s\n' "2.24.4" "${compose_version#v}" | sort -V | head -n1)
[[ $lowest == 2.24.4 ]] || die "Docker Compose $compose_version is too old; 2.24.4 or newer is needed"
echo "Docker Compose $compose_version"

# ---------------------------------------------------------------- 2. deploy user
log "2/6 deploy user '$DEPLOY_USER'"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "$DEPLOY_USER"
    usermod -p '*' "$DEPLOY_USER" # no password: key login only (not "!", which sshd treats as locked)
    echo "created $DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$home/.ssh"
touch "$home/.ssh/authorized_keys"
if ! grep -qF "$DEPLOY_PUBKEY" "$home/.ssh/authorized_keys"; then
    echo "$DEPLOY_PUBKEY" >>"$home/.ssh/authorized_keys"
    echo "added the CI public key"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$home/.ssh/authorized_keys"
chmod 600 "$home/.ssh/authorized_keys"
warn "members of the docker group are effectively root on this host. Only the CI key logs in as $DEPLOY_USER."

# ---------------------------------------------------------------- 3. folders
log "3/6 folders under $ROOT"
install -d -m 755 "$ROOT"
for env in staging prod; do
    install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$ROOT/$env"
done
install -d -m 700 "$ROOT/backups"
ls -ld "$ROOT"/*

# ---------------------------------------------------------------- 4. firewall
log "4/6 firewall"
if [[ $FIREWALL == yes ]]; then
    if ! ufw status | grep -q "Status: active"; then
        # Which public TCP ports are open besides SSH/80/443? Enabling ufw would close them.
        others=$(ss -Htlnp 2>/dev/null | awk '{print $4}' | grep -vE '^(127\.|\[::1\]|localhost)' |
            sed -E 's/.*:([0-9]+)$/\1/' | sort -un | grep -vxE "$SSH_PORT|80|443" | tr '\n' ' ' || true)
        if [[ -n $others && ${FIREWALL_FORCE:-no} != yes ]]; then
            die "ufw is off and these public ports are in use: $others
Turning ufw on would block them. Re-run with FIREWALL_FORCE=yes to accept that,
or FIREWALL=no to skip the firewall step."
        fi
    fi
    ufw allow "$SSH_PORT/tcp" comment "ssh" >/dev/null
    ufw allow 80/tcp comment "http (caddy)" >/dev/null
    ufw allow 443/tcp comment "https (caddy)" >/dev/null
    if [[ $MONGO_MODE == host ]]; then
        # Containers reach the host's mongod through the Docker bridges (172.16.0.0/12).
        ufw allow from 172.16.0.0/12 to any port 27017 proto tcp comment "mongo from docker" >/dev/null
    fi
    ufw --force enable >/dev/null
    ufw status verbose
    echo "Note: ports published by Docker skip ufw. The V-Menu frontends bind to 127.0.0.1 only."
else
    echo "skipped (FIREWALL=$FIREWALL)"
fi

# ---------------------------------------------------------------- 5. Caddy
log "5/6 Caddy (HTTPS reverse proxy)"
port_owner() { ss -Htlnp "sport = :$1" 2>/dev/null | grep -o 'users:(("[^"]*' | head -n1 | cut -d'"' -f2; }
owner80=$(port_owner 80)
owner443=$(port_owner 443)
if [[ (-n $owner80 && $owner80 != caddy) || (-n $owner443 && $owner443 != caddy) ]]; then
    warn "ports 80/443 already belong to '${owner80:-}${owner443:+/$owner443}'. Caddy is NOT installed."
    warn "Route $STAGING_HOST -> 127.0.0.1:$STAGING_PORT and $PROD_HOST -> 127.0.0.1:$PROD_PORT in that proxy (deploy/README.md has an nginx example)."
else
    fresh_caddy=no
    if ! command -v caddy >/dev/null; then
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' >/etc/apt/sources.list.d/caddy-stable.list
        apt-get update -qq
        apt-get install -y -qq caddy >/dev/null
        fresh_caddy=yes
    fi
    # Hostnames and ports live in an env file, so changing a hostname never touches the Caddyfile.
    cat >/etc/caddy/vmenu.env <<EOF
VMENU_STAGING_HOST=$STAGING_HOST
VMENU_PROD_HOST=$PROD_HOST
VMENU_STAGING_PORT=$STAGING_PORT
VMENU_PROD_PORT=$PROD_PORT
EOF
    install -d /etc/systemd/system/caddy.service.d
    cat >/etc/systemd/system/caddy.service.d/vmenu.conf <<'EOF'
[Service]
EnvironmentFile=/etc/caddy/vmenu.env
EOF
    install -m 644 "$HERE/Caddyfile" /etc/caddy/vmenu.caddy
    if [[ $fresh_caddy == yes ]] || ! grep -q '^import /etc/caddy/vmenu.caddy' /etc/caddy/Caddyfile 2>/dev/null; then
        if [[ $fresh_caddy == yes ]]; then
            echo "import /etc/caddy/vmenu.caddy" >/etc/caddy/Caddyfile
        else
            cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%s)"
            echo "import /etc/caddy/vmenu.caddy" >>/etc/caddy/Caddyfile
            echo "added 'import /etc/caddy/vmenu.caddy' to the existing Caddyfile (backup kept)"
        fi
    fi
    systemctl daemon-reload
    set -a
    # shellcheck source=/dev/null
    . /etc/caddy/vmenu.env
    set +a
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null || die "Caddy config is invalid"
    systemctl enable caddy >/dev/null
    systemctl restart caddy
    echo "Caddy serves https://$STAGING_HOST -> :$STAGING_PORT and https://$PROD_HOST -> :$PROD_PORT"
fi

# ---------------------------------------------------------------- 6. backups
log "6/6 daily MongoDB backup"
install -m 755 "$HERE/backup-mongo.sh" /usr/local/bin/vmenu-backup
install -d -m 700 /etc/vmenu
if [[ ! -f /etc/vmenu/backup.env ]]; then
    cat >/etc/vmenu/backup.env <<EOF
# Read by /usr/local/bin/vmenu-backup (cron, daily 03:15). Root-only file.
# A Mongo user with the "backup" role. With MONGO_MODE=host use 127.0.0.1 as the host.
MONGO_BACKUP_URI=
MONGO_MODE=$MONGO_MODE
MONGO_NETWORK=$MONGO_NETWORK
BACKUP_DIR=$ROOT/backups
KEEP_DAYS=7
EOF
    echo "created /etc/vmenu/backup.env: fill in MONGO_BACKUP_URI to turn backups on"
fi
chmod 600 /etc/vmenu/backup.env
cat >/etc/cron.d/vmenu-backup <<'EOF'
# V-Menu: daily MongoDB backup
15 3 * * * root /usr/local/bin/vmenu-backup >> /var/log/vmenu-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/vmenu-backup

# ---------------------------------------------------------------- done
log "Done"
cat <<EOF
Next:
  1. Add the GitHub secrets and variables listed in deploy/README.md.
     SSH_KNOWN_HOSTS for the GitHub secret:
$(ssh-keyscan -p "$SSH_PORT" localhost 2>/dev/null | sed "s/^localhost/  [YOUR_HOST]/; s/^\[localhost\]:$SSH_PORT/  [[YOUR_HOST]]:$SSH_PORT/" | head -n3)
     (replace [YOUR_HOST] with the value of SSH_HOST)
  2. Fill MONGO_BACKUP_URI in /etc/vmenu/backup.env, then test: sudo /usr/local/bin/vmenu-backup
  3. Run the Deploy workflow for staging (or merge to main once M3's release job calls it).
EOF
