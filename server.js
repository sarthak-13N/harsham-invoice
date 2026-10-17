// ============================================================
// server.js : Express backend (API) + serves the frontend in /public
// ============================================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const pool = require("./db");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // frontend files

// Wrap async routes so errors go to the error handler below
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------- Company details for the invoice header ----------
app.get("/api/config", (req, res) => {
  res.json({
    name: process.env.COMPANY_NAME || "Harsham Group",
    address: process.env.COMPANY_ADDRESS || "",
    gstin: process.env.COMPANY_GSTIN || "",
    email: process.env.COMPANY_EMAIL || "",
    phone: process.env.COMPANY_PHONE || ""
  });
});

// ---------- List all invoices (newest first) ----------
app.get("/api/invoices", wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, invoice_no, customer_name,
            to_char(invoice_date, 'YYYY-MM-DD') AS invoice_date, total, status
     FROM invoices ORDER BY id DESC`
  );
  res.json(rows);
}));

// ---------- Get one invoice with its items ----------
app.get("/api/invoices/:id", wrap(async (req, res) => {
  const inv = await pool.query(
    `SELECT *, to_char(invoice_date, 'YYYY-MM-DD') AS invoice_date
     FROM invoices WHERE id = $1`, [req.params.id]);
  if (inv.rowCount === 0) return res.status(404).json({ error: "Invoice not found" });
  const items = await pool.query(
    "SELECT description, quantity, unit_price, amount FROM invoice_items WHERE invoice_id = $1 ORDER BY id",
    [req.params.id]);
  res.json({ ...inv.rows[0], items: items.rows });
}));

// ---------- Create an invoice ----------
// Body: { customer_name, customer_address, customer_gstin, invoice_date, gst_percent,
//         items: [{ description, quantity, unit_price }] }
app.post("/api/invoices", wrap(async (req, res) => {
  const b = req.body;

  // 1) Validate input
  if (!b.customer_name || !String(b.customer_name).trim())
    return res.status(400).json({ error: "Customer name is required" });
  if (!Array.isArray(b.items) || b.items.length === 0)
    return res.status(400).json({ error: "Add at least one item" });
  const gst = Number(b.gst_percent ?? 18);
  if (isNaN(gst) || gst < 0 || gst > 100)
    return res.status(400).json({ error: "GST % must be between 0 and 100" });

  const items = [];
  for (const it of b.items) {
    const qty = Number(it.quantity), price = Number(it.unit_price);
    if (!it.description || !String(it.description).trim() || !(qty > 0) || isNaN(price) || price < 0)
      return res.status(400).json({ error: "Each item needs a description, quantity > 0 and price >= 0" });
    items.push({ description: String(it.description).trim(), qty, price, amount: +(qty * price).toFixed(2) });
  }

  // 2) Calculate totals on the server (never trust the browser)
  const subtotal = +items.reduce((s, i) => s + i.amount, 0).toFixed(2);
  const tax = +(subtotal * gst / 100).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  // 3) Save invoice + items in ONE transaction (all or nothing)
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inv = await client.query(
      `INSERT INTO invoices (customer_name, customer_address, customer_gstin, invoice_date,
                             gst_percent, subtotal, tax_amount, total)
       VALUES ($1,$2,$3, COALESCE($4::date, CURRENT_DATE), $5,$6,$7,$8)
       RETURNING id, invoice_no`,
      [b.customer_name.trim(), b.customer_address || null, b.customer_gstin || null,
       b.invoice_date || null, gst, subtotal, tax, total]);
    for (const i of items) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
         VALUES ($1,$2,$3,$4,$5)`,
        [inv.rows[0].id, i.description, i.qty, i.price, i.amount]);
    }
    await client.query("COMMIT");
    res.status(201).json(inv.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

// ---------- Mark PAID / UNPAID ----------
app.patch("/api/invoices/:id/status", wrap(async (req, res) => {
  const status = req.body.status;
  if (!["PAID", "UNPAID"].includes(status)) return res.status(400).json({ error: "Status must be PAID or UNPAID" });
  const r = await pool.query("UPDATE invoices SET status = $1 WHERE id = $2", [status, req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ error: "Invoice not found" });
  res.json({ ok: true });
}));

// ---------- Delete an invoice ----------
app.delete("/api/invoices/:id", wrap(async (req, res) => {
  await pool.query("DELETE FROM invoices WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Error handler: log real error, send a safe message ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error. Please try again." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Harsham invoice app running on port ${PORT}`));
