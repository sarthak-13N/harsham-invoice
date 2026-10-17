// ============================================================
// scripts/seed.js : creates the database (if missing) and runs db/seed.sql
// Uses the credentials from .env, so "psql" is not required.
// ============================================================
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const cfg = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};
const dbName = process.env.DB_NAME || "harsham_invoice";

async function main() {
  if (!cfg.user || !cfg.password) throw new Error("Set DB_USER and DB_PASSWORD in .env first.");
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error("DB_NAME may contain only letters, numbers and _");

  // Step 1: connect to the default "postgres" database and create ours if missing
  const admin = new Client({ ...cfg, database: "postgres" });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" created.`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }
  await admin.end();

  // Step 2: connect to our database and run the seed file
  const client = new Client({ ...cfg, database: dbName });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "seed.sql"), "utf8");
  await client.query(sql);
  await client.end();
  console.log("Tables created and sample data loaded. Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  console.error("Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env (and that the user can create databases).");
  process.exit(1);
});
