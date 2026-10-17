#!/usr/bin/env bash
# Connect your domain with Nginx and enable free HTTPS.
# Run:  sudo bash setup-nginx.sh invoice.yourdomain.com
# (Point the domain's DNS "A record" to this server's IP first.)
set -e
DOMAIN="$1"
[ -z "$DOMAIN" ] && { echo "Usage: sudo bash setup-nginx.sh yourdomain.com"; exit 1; }
cd "$(dirname "$0")"
PORT=$(grep ^PORT .env | cut -d= -f2); PORT=${PORT:-3000}

sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__PORT__/$PORT/g" nginx.conf.template > /etc/nginx/sites-available/harsham-invoice
ln -sf /etc/nginx/sites-available/harsham-invoice /etc/nginx/sites-enabled/harsham-invoice
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Free SSL certificate (auto-renews)
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
echo "Live at https://$DOMAIN"
