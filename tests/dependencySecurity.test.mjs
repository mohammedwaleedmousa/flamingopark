import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

const versionAtLeast = (actual, minimum) => {
  const left = actual.split(".").map(Number);
  const right = minimum.split(".").map(Number);

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference !== 0) return difference > 0;
  }

  return true;
};

test("production dependency lock excludes known pre-launch vulnerabilities", () => {
  assert.equal(packageJson.dependencies?.xlsx, undefined);
  assert.equal(packageLock.packages?.["node_modules/xlsx"], undefined);
  assert.ok(versionAtLeast(packageLock.packages["node_modules/react-router-dom"].version, "7.18.0"));
  assert.ok(versionAtLeast(packageLock.packages["node_modules/react-router"].version, "7.18.0"));
  assert.ok(versionAtLeast(packageLock.packages["node_modules/dompurify"].version, "3.4.13"));
  assert.ok(versionAtLeast(packageLock.packages["node_modules/nanoid"].version, "3.3.18"));
});
