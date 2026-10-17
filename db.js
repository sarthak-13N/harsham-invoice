// db.js : one shared PostgreSQL connection pool, configured from .env
require("dotenv").config();
const { Pool } = require("pg");

module.exports = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "harsham_invoice",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
