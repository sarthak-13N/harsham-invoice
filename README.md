# Harsham Group - Invoice Generator

Simple full-stack app: **HTML/JS frontend + Node.js/Express backend + PostgreSQL**.
Create invoices with GST, view/print as PDF, mark paid/unpaid, delete.

## Structure
```
server.js          Express API + serves the frontend
db.js              PostgreSQL connection (from .env)
db/seed.sql        Table creation + sample data
scripts/seed.js    Creates the database and runs seed.sql
public/            Frontend (index.html, style.css, app.js)
deploy.sh          One command deploy (install, seed, PM2)
server-setup.sh    One-time Ubuntu setup (Node, Nginx, PM2, firewall)
setup-nginx.sh     Domain + HTTPS (Nginx + Certbot)
```

## Deploy on an Ubuntu VPS

**1. One-time server setup (fresh VPS only)**
```
sudo bash server-setup.sh
```

**2. Upload and unzip the project, then:**
```
cd harsham-invoice
bash deploy.sh        # first run creates .env and stops
nano .env             # enter your PostgreSQL credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
bash deploy.sh        # installs, creates DB + tables, starts the app with PM2
```
The app now runs at `http://SERVER_IP:3000`.

**3. Domain + HTTPS (optional)**
Point your domain's A record to the server IP, then:
```
sudo bash setup-nginx.sh invoice.yourdomain.com
```

## No PostgreSQL yet? Install it on the same server
```
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER harsham WITH PASSWORD 'ChangeMe123' CREATEDB;"
```
Then use `DB_HOST=localhost`, `DB_USER=harsham`, `DB_PASSWORD=ChangeMe123` in `.env`.
`npm run seed` creates the database itself.

## Useful commands
```
pm2 status            # is the app running?
pm2 logs harsham-invoice
pm2 restart harsham-invoice
npm run seed          # re-run seed (safe; will not duplicate data)
```

## Update after code changes
```
git pull   (or upload new files)
bash deploy.sh
```

## API
| Method | URL | Purpose |
|---|---|---|
| GET | /api/invoices | List invoices |
| GET | /api/invoices/:id | One invoice with items |
| POST | /api/invoices | Create invoice |
| PATCH | /api/invoices/:id/status | Set PAID / UNPAID |
| DELETE | /api/invoices/:id | Delete invoice |

## Security notes
- Never commit `.env` (already in .gitignore).
- Use a strong PostgreSQL password; do not expose port 5432 to the internet.
- Totals are calculated on the server, not trusted from the browser.
