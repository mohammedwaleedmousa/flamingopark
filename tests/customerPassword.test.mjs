import assert from "node:assert/strict";
import test from "node:test";

import { isValidCustomerPassword } from "../src/lib/customerPassword.ts";

test("accepts simple and mixed customer passwords", () => {
  for (const password of ["111111", "123456", "abcdef", "abc123", "فلمنجو1", "a b c!"]) {
    assert.equal(isValidCustomerPassword(password), true);
  }
});

test("rejects only unusable password lengths", () => {
  assert.equal(isValidCustomerPassword("12345"), false);
  assert.equal(isValidCustomerPassword("      "), false);
  assert.equal(isValidCustomerPassword("a".repeat(73)), false);
  assert.equal(isValidCustomerPassword("م".repeat(37)), false);
  assert.equal(isValidCustomerPassword(`valid${String.fromCharCode(0)}`), false);
});
