import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  BillingDocument,
  DocumentKind,
  Session,
  Workspace,
} from "../apps/billing/src/domain/types";
import { emptyWorkspace, demoWorkspace } from "../apps/billing/src/data/demo";
import {
  blankParty,
  blankProduct,
  blankDocument,
  saveParty,
  saveProduct,
  productLine,
  saveDocument,
  finalizeDocument,
  duplicateDocument,
  recordPayment,
  cancelDocument,
  voidPayment,
  adjustStock,
  saveBatch,
  saveSettings,
} from "../apps/billing/src/services/commands";
import {
  stock,
  availableStock,
  status,
  outstanding,
  totals,
  batchStatus,
} from "../apps/billing/src/domain/selectors";
import {
  addDays,
  today,
  financialYear,
} from "../apps/billing/src/domain/dates";
import { allocateNumber } from "../apps/billing/src/domain/numbering";
import { buildReport, reportCsv } from "../apps/billing/src/services/reports";
const s: Session = {
  id: "test",
  name: "Test Admin",
  role: "Admin",
  demo: true,
};
function fixture(tracked = false) {
  const w = emptyWorkspace();
  saveParty(w, s, { ...blankParty("customer"), name: "Test customer" });
  saveParty(w, s, { ...blankParty("supplier"), name: "Test supplier" });
  saveProduct(
    w,
    s,
    {
      ...blankProduct(),
      name: "Test product",
      sku: "TEST-001",
      salePaise: 10000,
      purchasePaise: 6000,
      reorderMilli: 10000,
      batchTracking: tracked,
      expiryTracking: tracked,
    },
    tracked ? 0 : 100000,
  );
  return w;
}
function draft(w: Workspace, kind: DocumentKind = "invoice", qty = 1000) {
  const d = blankDocument(w, kind);
  d.partyId = w.parties[kind.startsWith("purchase") ? 1 : 0].id;
  d.items = [productLine(w.products[0], kind.startsWith("purchase"))];
  d.items[0].quantityMilli = qty;
  if (kind === "purchase-bill") d.reference = `SUP-${w.documents.length + 1}`;
  return saveDocument(w, s, d);
}
function doc(w: Workspace, id: string) {
  return w.documents.find((d) => d.id === id)!;
}
function pay(w: Workspace, d: BillingDocument, amount: number, date = today()) {
  return recordPayment(w, s, {
    direction: d.kind === "invoice" ? "received" : "made",
    documentId: d.id,
    partyId: d.partyId,
    date,
    amountPaise: amount,
    method: "Cash",
    reference: "",
    notes: "",
  });
}
function atomic(w: Workspace, action: (copy: Workspace) => void) {
  const copy = structuredClone(w);
  action(copy);
  Object.assign(w, copy);
}
function batch(
  w: Workspace,
  lot: string,
  days: number,
  qty = 10000,
  held = false,
) {
  return saveBatch(
    w,
    s,
    {
      id: "",
      productId: w.products[0].id,
      lot,
      manufactured: addDays(today(), -30),
      expires: addDays(today(), days),
      costPaise: 6000,
      salePaise: 10000,
      status: held ? "quarantined" : "active",
    },
    qty,
  );
}
test("customer → quotation → invoice → partial payment → paid updates stock once", () => {
  const w = fixture(),
    q = draft(w, "quotation", 4000);
  finalizeDocument(w, s, q);
  const id = duplicateDocument(w, s, q, "invoice");
  assert.equal(doc(w, q).status, "converted");
  assert.equal(stock(w, w.products[0].id), 100000);
  finalizeDocument(w, s, id);
  assert.equal(stock(w, w.products[0].id), 96000);
  pay(w, doc(w, id), 15000);
  assert.equal(status(w, doc(w, id)), "partially-paid");
  assert.equal(outstanding(w, doc(w, id)), 25000);
  pay(w, doc(w, id), 25000);
  assert.equal(status(w, doc(w, id)), "paid");
  assert.throws(() => finalizeDocument(w, s, id));
});
test("purchase order supports partial receipts and safe cancellation", () => {
  const w = fixture(),
    po = draft(w, "purchase-order", 10000);
  finalizeDocument(w, s, po);
  const first = duplicateDocument(w, s, po, "purchase-bill");
  doc(w, first).items[0].quantityMilli = 4000;
  doc(w, first).reference = "SUP-PART-1";
  finalizeDocument(w, s, first);
  assert.equal(stock(w, w.products[0].id), 104000);
  assert.equal(doc(w, po).status, "partially-received");
  const second = duplicateDocument(w, s, po, "purchase-bill");
  assert.equal(doc(w, second).items[0].quantityMilli, 6000);
  doc(w, second).reference = "SUP-PART-2";
  finalizeDocument(w, s, second);
  assert.equal(doc(w, po).status, "received");
  assert.equal(stock(w, w.products[0].id), 110000);
  cancelDocument(w, s, second);
  assert.equal(stock(w, w.products[0].id), 104000);
  assert.equal(doc(w, po).status, "partially-received");
});
test("sales trigger low-stock reporting from the same ledger", () => {
  const w = fixture(),
    id = draft(w, "invoice", 95000);
  finalizeDocument(w, s, id);
  assert.equal(availableStock(w, w.products[0].id), 5000);
  assert.equal(buildReport(w, "low-stock").rows[0].id, w.products[0].id);
});
test("FEFO excludes expired and quarantined batches and consumes nearest expiry", () => {
  const w = fixture(true),
    expired = batch(w, "EXPIRED", -1),
    held = batch(w, "HELD", 5, 10000, true),
    near = batch(w, "NEAR", 10),
    later = batch(w, "LATER", 100);
  assert.equal(
    batchStatus(w, w.batches.find((b) => b.id === near)!),
    "near-expiry",
  );
  assert.equal(availableStock(w, w.products[0].id), 20000);
  const id = draft(w, "invoice", 12000);
  finalizeDocument(w, s, id);
  assert.equal(stock(w, w.products[0].id, near), 0);
  assert.equal(stock(w, w.products[0].id, later), 8000);
  assert.equal(stock(w, w.products[0].id, expired), 10000);
  assert.equal(stock(w, w.products[0].id, held), 10000);
});
test("failed multiline finalization rolls back all stock and snapshots", () => {
  const w = fixture(),
    id = draft(w, "invoice", 60000);
  doc(w, id).items.push({
    ...productLine(w.products[0]),
    quantityMilli: 60000,
  });
  const before = structuredClone(w);
  assert.throws(() => atomic(w, (next) => finalizeDocument(next, s, id)));
  assert.deepEqual(w, before);
  assert.equal(doc(w, id).status, "draft");
});
test("repeated sales lines and partial credits restore original batch allocation exactly", () => {
  const w = fixture(true),
    a = batch(w, "A", 10, 1000),
    b = batch(w, "B", 90, 4000),
    id = draft(w, "invoice", 2000);
  doc(w, id).items.push({ ...productLine(w.products[0]), quantityMilli: 2000 });
  finalizeDocument(w, s, id);
  const cn = duplicateDocument(w, s, id, "credit-note");
  doc(w, cn).items[1].quantityMilli = 1000;
  finalizeDocument(w, s, cn);
  assert.equal(stock(w, w.products[0].id), 4000);
  const cn2 = duplicateDocument(w, s, id, "credit-note");
  doc(w, cn2).items.splice(0, 1);
  doc(w, cn2).items[0].quantityMilli = 1000;
  finalizeDocument(w, s, cn2);
  assert.equal(stock(w, w.products[0].id, a), 1000);
  assert.equal(stock(w, w.products[0].id, b), 4000);
  assert.equal(outstanding(w, doc(w, id)), 0);
});
test("purchase return restores original quantity and clears unpaid balance", () => {
  const w = fixture(),
    id = draft(w, "purchase-bill", 10000);
  finalizeDocument(w, s, id);
  const ret = duplicateDocument(w, s, id, "purchase-return");
  finalizeDocument(w, s, ret);
  assert.equal(stock(w, w.products[0].id), 100000);
  assert.equal(outstanding(w, doc(w, id)), 0);
});
test("posted documents retain immutable business, contact, item and total snapshots", () => {
  const w = fixture(),
    id = draft(w);
  finalizeDocument(w, s, id);
  const original = structuredClone(doc(w, id));
  saveParty(w, s, { ...w.parties[0], name: "Renamed" });
  saveProduct(w, s, { ...w.products[0], name: "Changed item", salePaise: 123 });
  saveSettings(w, s, { ...w.settings, name: "Changed business" });
  assert.deepEqual(doc(w, id), original);
  assert.throws(() => saveDocument(w, s, { ...original, notes: "Modified" }));
});
test("cancelled conversion reopens its quotation and reverses stock with audit", () => {
  const w = fixture(),
    q = draft(w, "quotation");
  finalizeDocument(w, s, q);
  const id = duplicateDocument(w, s, q, "invoice");
  finalizeDocument(w, s, id);
  cancelDocument(w, s, id);
  assert.equal(doc(w, q).status, "sent");
  assert.equal(stock(w, w.products[0].id), 100000);
  assert.equal(w.movements.at(-1)?.type, "reversal");
});
test("payment void retains history and permits later cancellation", () => {
  const w = fixture(),
    id = draft(w);
  finalizeDocument(w, s, id);
  assert.throws(() => pay(w, doc(w, id), 10001));
  assert.throws(() => pay(w, doc(w, id), 1, addDays(today(), -1)));
  const payment = pay(w, doc(w, id), 3000);
  assert.throws(() => cancelDocument(w, s, id));
  voidPayment(w, s, payment);
  assert.equal(w.payments[0].voided, true);
  assert.equal(outstanding(w, doc(w, id)), 10000);
  cancelDocument(w, s, id);
});
test("stock adjustments require a reason and forbid negative stock", () => {
  const w = fixture();
  assert.throws(() => adjustStock(w, s, w.products[0].id, "", 1000, ""));
  assert.throws(() =>
    adjustStock(w, s, w.products[0].id, "", -100001, "Count"),
  );
  adjustStock(w, s, w.products[0].id, "", -2000, "Physical stock count");
  assert.equal(stock(w, w.products[0].id), 98000);
  assert.equal(w.audit[0].action, "Stock adjusted");
});
test("archive preserves history and stock units cannot change after movement", () => {
  const w = fixture(),
    id = draft(w);
  finalizeDocument(w, s, id);
  saveProduct(w, s, { ...w.products[0], active: false });
  assert.equal(totals(doc(w, id)).grandTotal, 10000);
  assert.throws(() => saveProduct(w, s, { ...w.products[0], unit: "Pack" }));
  assert.throws(() => draft(w));
});
test("GST finalization requires confirmed business and supply states", () => {
  const w = fixture(),
    id = draft(w);
  doc(w, id).taxPolicy.enabled = true;
  doc(w, id).items[0].taxBps = 1800;
  assert.throws(() => finalizeDocument(w, s, id), /state/);
  doc(w, id).taxPolicy.businessState = "29";
  doc(w, id).taxPolicy.placeOfSupply = "27";
  doc(w, id).placeOfSupply = "27";
  finalizeDocument(w, s, id);
  assert.equal(totals(doc(w, id)).igst, 1800);
});
test("credit limits block additional invoices without stock mutation", () => {
  const w = fixture();
  w.parties[0].creditLimitPaise = 5000;
  const id = draft(w);
  assert.throws(
    () => atomic(w, (next) => finalizeDocument(next, s, id)),
    /credit limit/i,
  );
  assert.equal(stock(w, w.products[0].id), 100000);
});
test("draft identity and source cannot be changed by editing", () => {
  const w = fixture(),
    id = draft(w);
  assert.throws(() => saveDocument(w, s, { ...doc(w, id), kind: "quotation" }));
  assert.throws(() => saveDocument(w, s, { ...doc(w, id), sourceId: "other" }));
});
test("supplier invoice reference is required and unique for that supplier", () => {
  const w = fixture(),
    first = draft(w, "purchase-bill");
  doc(w, first).reference = "";
  assert.throws(() => finalizeDocument(w, s, first), /reference|invoice/i);
  doc(w, first).reference = "INV-A";
  finalizeDocument(w, s, first);
  const second = draft(w, "purchase-bill");
  doc(w, second).reference = "INV-A";
  assert.throws(() => finalizeDocument(w, s, second), /already|duplicate/i);
});
test("backward sequences skip all reserved and cancelled document numbers", () => {
  const w = fixture(),
    first = draft(w);
  cancelDocument(w, s, first);
  const before = doc(w, first).number;
  w.settings.numbering.invoice.next = 1;
  const second = draft(w);
  assert.notEqual(doc(w, second).number, before);
  assert.ok(doc(w, second).number.endsWith("000002"));
});
test("financial-year boundary resets safely and retains year when reset enabled", () => {
  const w = fixture(),
    r = w.settings.numbering.invoice;
  r.includeFY = false;
  assert.equal(financialYear("2026-03-31", 4), "2025-26");
  assert.equal(financialYear("2026-04-01", 4), "2026-27");
  assert.equal(allocateNumber(w, "invoice", "2026-03-31"), "INV2025-26/000001");
  assert.equal(allocateNumber(w, "invoice", "2026-04-01"), "INV2026-27/000001");
});
test("reports net credits and CSV neutralizes spreadsheet formulas without breaking negative numbers", () => {
  const w = fixture(),
    id = draft(w, "invoice", 2000);
  finalizeDocument(w, s, id);
  const cn = duplicateDocument(w, s, id, "credit-note");
  doc(w, cn).items[0].quantityMilli = 1000;
  finalizeDocument(w, s, cn);
  const r = buildReport(w, "customers");
  assert.equal(r.rows[0].cells[3], 10000);
  const csv = reportCsv({
    columns: [{ title: "Name" }, { title: "Amount", type: "money" }],
    rows: [{ id: "x", cells: ['=HYPERLINK("x")', -12345] }],
    note: "",
  });
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"-123.45"'));
});
test("demo seed is explicit, complete and keeps unknown legal fields blank", () => {
  const w = demoWorkspace();
  assert.equal(w.products.length, 55);
  for (const p of w.products) assert.ok(stock(w, p.id) >= 0);
  assert.equal(w.settings.gstin, "");
  assert.equal(w.settings.address, "");
  assert.equal(w.settings.stateCode, "");
  assert.equal(w.settings.accountNumber, "");
  assert.ok(w.parties.every((p) => p.name.startsWith("Demo")));
  assert.throws(() =>
    saveSettings(w, s, { ...w.settings, logo: "https://example.com/logo.png" }),
  );
});
