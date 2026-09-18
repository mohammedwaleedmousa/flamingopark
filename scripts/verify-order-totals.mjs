import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Compile the dependency-free pricing module in memory so this runs on CI's Node 20.
const source = readFileSync(new URL("../src/lib/orderTotals.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { calculateOrderTotals } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("10% discounts apply to products and leave the full delivery fee payable", () => {
  assert.deepEqual(calculateOrderTotals(100, 10, 10, "percentage"), {
    subtotal: 100, deliveryFee: 10, discountAmount: 10, total: 100,
  });
  assert.equal(calculateOrderTotals(100, 30, 10, "percentage").total, 120);
});

test("fixed discounts are capped at products, including coupons larger than the order", () => {
  for (const discount of [100, 105, 150]) {
    assert.deepEqual(calculateOrderTotals(100, 10, discount), {
      subtotal: 100, deliveryFee: 10, discountAmount: 100, total: 10,
    });
  }
});

test("full product discounts and empty product totals cannot discount delivery", () => {
  assert.equal(calculateOrderTotals(100, 10, 100, "percentage").total, 10);
  assert.equal(calculateOrderTotals(100, 10, 150, "percentage").total, 10);
  assert.equal(calculateOrderTotals(0, 10, 50).total, 10);
});

test("discounts follow the current cart subtotal after product removal", () => {
  assert.equal(calculateOrderTotals(50, 10, 10, "percentage").discountAmount, 5);
  assert.equal(calculateOrderTotals(50, 10, 80).total, 10);
});

test("undiscounted orders, free delivery and native currencies keep their amounts", () => {
  assert.equal(calculateOrderTotals(100, 10).total, 110);
  assert.equal(calculateOrderTotals(100, 0, 10, "percentage").total, 90);
  assert.equal(calculateOrderTotals(41000, 4100, 10, "percentage").total, 41000);
  assert.equal(calculateOrderTotals(14000, 1400, 1400).total, 14000);
  assert.equal(calculateOrderTotals(100.25, 10.5, 5.25).total, 105.5);
});

test("a negative discount never increases the amount due", () => {
  assert.equal(calculateOrderTotals(100, 10, -5).total, 110);
  assert.equal(calculateOrderTotals(100, 10, -5, "percentage").total, 110);
});
