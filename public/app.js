// ============================================================
// app.js : frontend logic (plain JavaScript, no frameworks)
// ============================================================
const $ = (id) => document.getElementById(id);
const money = (n) => "\u20B9" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Escape text before putting it into HTML (prevents XSS)
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let company = {};

// Small helper for calling our API
async function api(url, options) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---------- Items table in the form ----------
function addItemRow(desc = "", qty = 1, price = 0) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="d" value="${esc(desc)}" placeholder="Item / service"></td>
    <td><input class="q" type="number" min="0.01" step="0.01" value="${qty}" style="width:70px"></td>
    <td><input class="p" type="number" min="0" step="0.01" value="${price}" style="width:100px"></td>
    <td class="a">0.00</td>
    <td><button type="button" class="small danger">x</button></td>`;
  tr.querySelector("button").onclick = () => { tr.remove(); recalc(); };
  tr.querySelectorAll("input").forEach((i) => (i.oninput = recalc));
  $("itemsTable").querySelector("tbody").appendChild(tr);
  recalc();
}

// Show live totals (the server recalculates the final values)
function recalc() {
  let sub = 0;
  document.querySelectorAll("#itemsTable tbody tr").forEach((tr) => {
    const amt = (Number(tr.querySelector(".q").value) || 0) * (Number(tr.querySelector(".p").value) || 0);
    tr.querySelector(".a").textContent = amt.toFixed(2);
    sub += amt;
  });
  const tax = sub * (Number($("gst_percent").value) || 0) / 100;
  $("tSub").textContent = money(sub);
  $("tTax").textContent = money(tax);
  $("tTotal").textContent = money(sub + tax);
}

// ---------- Save invoice ----------
$("invoiceForm").onsubmit = async (e) => {
  e.preventDefault();
  const items = [...document.querySelectorAll("#itemsTable tbody tr")].map((tr) => ({
    description: tr.querySelector(".d").value,
    quantity: tr.querySelector(".q").value,
    unit_price: tr.querySelector(".p").value
  }));
  try {
    const saved = await api("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customer_name: $("customer_name").value,
        customer_address: $("customer_address").value,
        customer_gstin: $("customer_gstin").value,
        invoice_date: $("invoice_date").value,
        gst_percent: $("gst_percent").value,
        items
      })
    });
    resetForm();
    await loadList();
    viewInvoice(saved.id);
  } catch (err) {
    $("formMsg").textContent = err.message;
    $("formMsg").style.color = "#b32424";
  }
};

function resetForm() {
  $("invoiceForm").reset();
  $("invoice_date").value = new Date().toISOString().slice(0, 10);
  $("gst_percent").value = 18;
  $("itemsTable").querySelector("tbody").innerHTML = "";
  $("formMsg").textContent = "";
  addItemRow();
}

// ---------- Invoice list ----------
async function loadList() {
  const rows = await api("/api/invoices");
  $("listTable").querySelector("tbody").innerHTML = rows.map((r) => `
    <tr>
      <td>${esc(r.invoice_no)}</td>
      <td>${esc(r.customer_name)}</td>
      <td>${esc(r.invoice_date)}</td>
      <td>${money(r.total)}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>
        <button class="small" onclick="viewInvoice(${r.id})">View</button>
        <button class="small secondary" onclick="toggleStatus(${r.id}, '${r.status}')">
          Mark ${r.status === "PAID" ? "Unpaid" : "Paid"}</button>
        <button class="small danger" onclick="removeInvoice(${r.id})">Delete</button>
      </td>
    </tr>`).join("") || '<tr><td colspan="6">No invoices yet.</td></tr>';
}

async function toggleStatus(id, current) {
  await api(`/api/invoices/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: current === "PAID" ? "UNPAID" : "PAID" }) });
  loadList();
}

async function removeInvoice(id) {
  if (!confirm("Delete this invoice?")) return;
  await api(`/api/invoices/${id}`, { method: "DELETE" });
  loadList();
}

// ---------- Printable invoice ----------
async function viewInvoice(id) {
  const inv = await api(`/api/invoices/${id}`);
  const rows = inv.items.map((i, n) => `
    <tr><td>${n + 1}</td><td>${esc(i.description)}</td><td>${Number(i.quantity)}</td>
        <td class="right">${money(i.unit_price)}</td><td class="right">${money(i.amount)}</td></tr>`).join("");
  $("invoiceView").innerHTML = `
    <div class="inv-actions">
      <button onclick="window.print()">Print / Save as PDF</button>
      <button class="secondary" onclick="closeInvoice()">Back</button>
    </div>
    <div class="inv-head">
      <div>
        <h2>${esc(company.name)}</h2>
        <div>${esc(company.address)}</div>
        ${company.gstin ? `<div>GSTIN: ${esc(company.gstin)}</div>` : ""}
        ${company.email ? `<div>${esc(company.email)}</div>` : ""}
        ${company.phone ? `<div>${esc(company.phone)}</div>` : ""}
      </div>
      <div class="right"><h2>INVOICE</h2><div><b>${esc(inv.invoice_no)}</b></div><div>Date: ${esc(inv.invoice_date)}</div><div>${inv.status}</div></div>
    </div>
    <p><b>Bill To:</b><br>${esc(inv.customer_name)}<br>${esc(inv.customer_address)}
       ${inv.customer_gstin ? `<br>GSTIN: ${esc(inv.customer_gstin)}` : ""}</p>
    <table>
      <thead><tr><th>#</th><th>Description</th><th>Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div>Subtotal: ${money(inv.subtotal)}</div>
      <div>GST (${Number(inv.gst_percent)}%): ${money(inv.tax_amount)}</div>
      <div><b>Total: ${money(inv.total)}</b></div>
    </div>
    <p style="text-align:center;font-size:12px;color:#666">This is a computer generated invoice.</p>`;
  document.querySelector("main").classList.add("hidden");
  $("invoiceView").classList.remove("hidden");
  window.scrollTo(0, 0);
}

function closeInvoice() {
  $("invoiceView").classList.add("hidden");
  document.querySelector("main").classList.remove("hidden");
}

// ---------- Start ----------
$("addItem").onclick = () => addItemRow();
$("gst_percent").oninput = recalc;
(async function init() {
  company = await api("/api/config");
  $("companyTitle").textContent = company.name + " - Invoice Generator";
  document.title = company.name + " Invoices";
  resetForm();
  loadList();
})();
