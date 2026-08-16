import assert from "node:assert/strict";
import test from "node:test";

import {
  isWeakRegistrationPin,
  normalizeNumericPin,
  normalizeYemenPhone,
  toYemenLocalPhone,
} from "../src/lib/yemenPhone.ts";

test("normalizes supported Yemeni mobile formats", () => {
  for (const phone of ["771234567", "0771234567", "967771234567", "+967 771 234 567", "00967-771-234-567", "٧٧١٢٣٤٥٦٧"]) {
    assert.equal(normalizeYemenPhone(phone), "+967771234567");
  }
});

test("rejects malformed, non-mobile, and overlong phone numbers", () => {
  for (const phone of ["", "123", "+9677712345678", "+967171234567", "+96777abc4567", "+966771234567"]) {
    assert.equal(normalizeYemenPhone(phone), null);
  }
});

test("bounds UI phone and PIN input to numeric values", () => {
  assert.equal(toYemenLocalPhone("+967 ٧٧١-٢٣٤-٥٦٧99"), "771234567");
  assert.equal(normalizeNumericPin("١٢a٣٤-٥٦٧٨٩٠١٢٣٤"), "123456789012");
});

test("rejects weak registration PINs", () => {
  assert.equal(isWeakRegistrationPin("111111", "+967771234567"), true);
  assert.equal(isWeakRegistrationPin("123456", "+967771234567"), true);
  assert.equal(isWeakRegistrationPin("234567", "+967771234567"), true);
  assert.equal(isWeakRegistrationPin("121212", "+967771234567"), true);
  assert.equal(isWeakRegistrationPin("234567", "+967712234567"), true);
  assert.equal(isWeakRegistrationPin("804271", "+967771234567"), false);
});

