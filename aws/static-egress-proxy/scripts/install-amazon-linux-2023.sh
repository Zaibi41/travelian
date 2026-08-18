#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/travelian-static-egress"
DOMAIN="${PROXY_DOMAIN:-provider-egress.travelian.pk}"
TOKEN_FILE="/etc/travelian-egress-token"
HOSTS_FILE="/etc/travelian-egress-hosts"

dnf update -y
dnf install -y nodejs npm dnf-plugins-core curl openssl
if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=amd64" -o /usr/local/bin/caddy
  chmod 755 /usr/local/bin/caddy
fi

mkdir -p "$APP_DIR"
cp "$(dirname "$0")/../server.mjs" "$APP_DIR/server.mjs"

if [ ! -f "$TOKEN_FILE" ]; then
  openssl rand -hex 32 > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
fi

cat > "$HOSTS_FILE" <<'HOSTS'
api.pp.travelport.net
auth.pp.travelport.net
api.travelian.pk
alhaidertravel.pk
api.dhilluandsahi.com
api.skypass.pk
dev.skypass.pk
HOSTS

cat > /etc/systemd/system/travelian-egress-proxy.service <<'SERVICE'
[Unit]
Description=Travelian static egress proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/travelian-static-egress
Environment=PORT=8787
EnvironmentFile=/etc/travelian-egress.env
ExecStart=/usr/bin/node /opt/travelian-static-egress/server.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/systemd/system/caddy.service <<'SERVICE'
[Unit]
Description=Caddy web server
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/travelian-egress.env <<ENV
EGRESS_PROXY_TOKEN=$(cat "$TOKEN_FILE")
ALLOWED_EGRESS_HOSTS=$(paste -sd, "$HOSTS_FILE")
ENV
chmod 600 /etc/travelian-egress.env

cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
  encode gzip
  reverse_proxy 127.0.0.1:8787
}
CADDY

systemctl daemon-reload
systemctl enable --now travelian-egress-proxy
systemctl enable --now caddy
