#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu VPS: Node.js 20, Nginx, PM2, Certbot, firewall, fail2ban.
# Run:  sudo bash server-setup.sh
set -e
apt update && apt -y upgrade
apt install -y curl nginx ufw fail2ban certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
# Firewall: allow SSH + web traffic only
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now nginx fail2ban
echo "Server ready. Node: $(node -v)"
