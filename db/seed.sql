-- ============================================================
-- seed.sql : creates tables + sample data.
-- Safe to run many times (IF NOT EXISTS / only seeds when empty).
-- Run with:  npm run seed   (done automatically by deploy.sh)
-- ============================================================

-- Counter used to build invoice numbers like HG-2026-0001
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- One row per invoice
CREATE TABLE IF NOT EXISTS invoices (
  id               SERIAL PRIMARY KEY,
  invoice_no       TEXT UNIQUE NOT NULL
                   DEFAULT ('HG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 4, '0')),
  customer_name    TEXT NOT NULL,
  customer_address TEXT,
  customer_gstin   TEXT,
  invoice_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  gst_percent      NUMERIC(5,2)  NOT NULL DEFAULT 18,
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID','PAID')),
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- Many items per invoice (deleted automatically with the invoice)
CREATE TABLE IF NOT EXISTS invoice_items (
  id          SERIAL PRIMARY KEY,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  amount      NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);

-- ---------- Sample data (only inserted if no invoices exist) ----------
DO $$
DECLARE inv_id INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM invoices) THEN

    INSERT INTO invoices (customer_name, customer_address, customer_gstin, gst_percent, subtotal, tax_amount, total, status)
    VALUES ('Sample Customer Pvt Ltd', 'Baner, Pune', '27ABCDE1234F1Z5', 18, 19500.00, 3510.00, 23010.00, 'UNPAID')
    RETURNING id INTO inv_id;
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES
      (inv_id, 'Website hosting (1 year)', 1, 12000.00, 12000.00),
      (inv_id, 'Support hours', 5, 1500.00, 7500.00);

    INSERT INTO invoices (customer_name, customer_address, gst_percent, subtotal, tax_amount, total, status)
    VALUES ('Demo Traders', 'Hinjewadi, Pune', 12, 5000.00, 600.00, 5600.00, 'PAID')
    RETURNING id INTO inv_id;
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES
      (inv_id, 'Stationery packs', 20, 250.00, 5000.00);

  END IF;
END $$;
