import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const helperSource = readFileSync(new URL("../supabase/functions/_shared/jwtClaims.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { readAalClaim } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const token = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

test("recognizes aal2 only when the token payload explicitly says aal2", () => {
  assert.equal(readAalClaim(token({ aal: "aal2" })), "aal2");
  assert.equal(readAalClaim(token({ aal: "aal1" })), "aal1");
  assert.equal(readAalClaim(token({})), "aal1");
});

test("fails closed for malformed JWTs and unexpected assurance values", () => {
  assert.equal(readAalClaim("not-a-jwt"), "aal1");
  assert.equal(readAalClaim(token({ aal: "aal3" })), "aal1");
  assert.equal(readAalClaim("header.!!!!.signature"), "aal1");
});

test("invoice function validates access token and gates admin invoice operations", () => {
  const source = readFileSync(new URL("../supabase/functions/invoice-access/index.ts", import.meta.url), "utf8");
  assert.match(source, /auth\.auth\.getUser\(accessToken\)/);
  assert.match(source, /authorization\.match\(\/\^Bearer\\s\+/);
  assert.match(source, /isAdmin\s*&&\s*aal\s*!==\s*"aal2"/);
  assert.match(source, /MFA verification required/);
});
