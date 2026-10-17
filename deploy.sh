#!/usr/bin/env bash
# Deploy / update the app.  Run:  bash deploy.sh
set -e
cd "$(dirname "$0")"

# First run: create .env and ask the user to fill in the credentials
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env  ->  edit it with your PostgreSQL credentials, then run: bash deploy.sh"
  exit 1
fi

npm install --omit=dev          # install dependencies
npm run seed                    # create database + tables + sample data
pm2 startOrReload ecosystem.config.js   # start (or restart) the app
pm2 save                        # remember the app after server reboot
pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1 || true

echo "Done. App is running on port $(grep ^PORT .env | cut -d= -f2). Check: pm2 status"
