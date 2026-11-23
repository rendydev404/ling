#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node)"
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"

mkdir -p "${SYSTEMD_USER_DIR}"

cat > "${SYSTEMD_USER_DIR}/ling-supabase-keepalive.service" <<EOF
[Unit]
Description=Ling Supabase Anti-Pause Keep-Alive Ping
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${PROJECT_DIR}
Environment=KEEPALIVE_SOURCE=systemd-timer
ExecStart=${NODE_BIN} ${PROJECT_DIR}/scripts/supabase-keepalive.mjs
EOF

cat > "${SYSTEMD_USER_DIR}/ling-supabase-keepalive.timer" <<EOF
[Unit]
Description=Run Ling Supabase Keep-Alive every 12 hours (prevents 7-day auto-pause)

[Timer]
OnBootSec=2min
OnUnitActiveSec=12h
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now ling-supabase-keepalive.timer
systemctl --user start ling-supabase-keepalive.service

echo "Systemd timer 'ling-supabase-keepalive.timer' installed and active!"
systemctl --user list-timers ling-supabase-keepalive.timer --no-pager
