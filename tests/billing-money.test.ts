import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  parseFixed,
  balance,
} from "../apps/billing/src/domain/money";
import type { LineItem, TaxPolicy } from "../apps/billing/src/domain/types";
const policy: TaxPolicy = {
  enabled: true,
  inclusive: false,
  businessState: "29",
  placeOfSupply: "29",
  rounding: "paise",
  stateTaxLabel: "SGST",
};
const line = (patch: Partial<LineItem> = {}): LineItem => ({
  id: "line",
  productId: "p",
  name: "Demo product",
  description: "",
  hsn: "",
  unit: "Nos",
  quantityMilli: 1000,
  ratePaise: 10000,
  discountBps: 0,
  taxBps: 1800,
  batchId: "",
  sourceItemId: "",
  receivedMilli: 0,
  ...patch,
});
test("exclusive GST and intra-state split use paise", () => {
  const t = calculate([line({ quantityMilli: 2000 })], 0, policy);
  assert.equal(t.grandTotal, 23600);
  assert.equal(t.cgst, 1800);
  assert.equal(t.sgst, 1800);
  assert.equal(t.igst, 0);
});
test("mixed line tax rates round independently", () => {
  const t = calculate(
    [line({ ratePaise: 10001, taxBps: 500 }), line({ ratePaise: 999 })],
    0,
    policy,
  );
  assert.equal(t.subtotal, 11000);
  assert.equal(t.tax, 680);
  assert.equal(t.grandTotal, 11680);
});
test("line discount precedes proportional document discount and tax", () => {
  const t = calculate(
    [line({ quantityMilli: 2000, discountBps: 1000 })],
    1000,
    policy,
  );
  assert.equal(t.discount, 3000);
  assert.equal(t.taxable, 17000);
  assert.equal(t.tax, 3060);
  assert.equal(t.grandTotal, 20060);
});
test("largest-remainder allocation conserves every discount paise", () => {
  const t = calculate(
    [
      line({ ratePaise: 100 }),
      line({ ratePaise: 100 }),
      line({ ratePaise: 100 }),
    ],
    2,
    { ...policy, enabled: false },
  );
  assert.deepEqual(
    t.lines.map((x) => x.documentDiscount),
    [1, 1, 0],
  );
  assert.equal(t.grandTotal, 298);
});
test("inter-state supply uses IGST only", () => {
  const t = calculate([line()], 0, { ...policy, placeOfSupply: "27" });
  assert.equal(t.igst, 1800);
  assert.equal(t.cgst + t.sgst, 0);
});
test("inclusive GST reverses tax without floating point", () => {
  const t = calculate([line({ ratePaise: 11800 })], 0, {
    ...policy,
    inclusive: true,
  });
  assert.equal(t.taxable, 10000);
  assert.equal(t.tax, 1800);
  assert.equal(t.grandTotal, 11800);
});
test("inclusive discounts reduce the tax-inclusive consideration", () => {
  const t = calculate([line({ ratePaise: 11800, discountBps: 1000 })], 1180, {
    ...policy,
    inclusive: true,
  });
  assert.equal(t.taxable, 8000);
  assert.equal(t.tax, 1440);
  assert.equal(t.grandTotal, 9440);
});
test("rupee rounding retains an explicit signed adjustment", () => {
  for (const [input, total, delta] of [
    [106, 100, -6],
    [151, 200, 49],
    [150, 200, 50],
  ]) {
    const t = calculate([line({ ratePaise: input })], 0, {
      ...policy,
      enabled: false,
      rounding: "rupee",
    });
    assert.equal(t.grandTotal, total);
    assert.equal(t.roundOff, delta);
  }
});
test("odd tax paise splits deterministically without losing a paise", () => {
  const t = calculate([line({ ratePaise: 100, taxBps: 500 })], 0, policy);
  assert.equal(t.cgst, 3);
  assert.equal(t.sgst, 2);
  assert.equal(t.tax, 5);
});
test("fractional quantities round once at line subtotal", () => {
  const t = calculate([line({ quantityMilli: 125, ratePaise: 101 })], 0, {
    ...policy,
    enabled: false,
  });
  assert.equal(t.subtotal, 13);
});
test("missing state never silently assumes intra-state GST", () => {
  const t = calculate([line()], 0, { ...policy, businessState: "" });
  assert.equal(t.jurisdiction, "unresolved");
  assert.equal(t.unallocatedTax, 1800);
  assert.equal(t.cgst + t.sgst + t.igst, 0);
});
test("GST disabled and full discount produce zero tax and total", () => {
  const t = calculate([line({ discountBps: 10000 })], 0, {
    ...policy,
    enabled: false,
  });
  assert.equal(t.grandTotal, 0);
  assert.equal(t.tax, 0);
});
test("balances support partial and full settlement with credits", () => {
  assert.equal(balance(10000, 2500), 7500);
  assert.equal(balance(10000, 7500, 2500), 0);
});
test("balances reject overpayments and negative credits", () => {
  assert.throws(() => balance(10000, 10001));
  assert.throws(() => balance(10000, 10000, 1));
  assert.throws(() => balance(100, 0, -1));
});
test("invalid quantity, rates, discounts and empty documents reject", () => {
  for (const patch of [
    { quantityMilli: 0 },
    { quantityMilli: -1 },
    { ratePaise: -1 },
    { discountBps: 10001 },
    { taxBps: 10001 },
  ])
    assert.throws(() => calculate([line(patch)], 0, policy));
  assert.throws(() => calculate([], 0, policy));
  assert.throws(() => calculate([line()], 10001, policy));
});
test("decimal input is exact and rejects exponent or excessive precision", () => {
  assert.equal(parseFixed("0.29"), 29);
  assert.equal(parseFixed("12.345", 3), 12345);
  for (const x of ["1.001", "1e3", "-1", "NaN", ""])
    assert.throws(() => parseFixed(x));
});
test("unsafe monetary magnitude cannot enter the calculation", () => {
  assert.throws(() => parseFixed("900719925474099.99"));
  assert.throws(() =>
    calculate(
      [
        line({
          quantityMilli: Number.MAX_SAFE_INTEGER,
          ratePaise: Number.MAX_SAFE_INTEGER,
        }),
      ],
      0,
      policy,
    ),
  );
});
test("all line allocations and tax components reconcile with the grand total", () => {
  const t = calculate(
    [
      line({ quantityMilli: 1750, ratePaise: 34789, discountBps: 725 }),
      line({ ratePaise: 5693, taxBps: 500 }),
      line({ ratePaise: 77, taxBps: 0 }),
    ],
    1493,
    { ...policy, rounding: "rupee" },
  );
  assert.equal(t.tax, t.cgst + t.sgst);
  assert.equal(t.grandTotal, t.taxable + t.tax + t.roundOff);
  assert.equal(
    t.lines.reduce((s, l) => s + l.documentDiscount, 0),
    1493,
  );
  assert.equal(t.subtotal - t.discount, t.taxable);
});
