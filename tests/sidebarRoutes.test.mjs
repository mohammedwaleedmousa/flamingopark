import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const appSource = readSource("../src/App.tsx");
const adminLayoutSource = readSource("../src/components/admin/AdminLayout.tsx");
const adminSidebarSource = readSource("../src/components/admin/AdminSidebar.tsx");
const adminLoginSource = readSource("../src/pages/admin/AdminLoginPage.tsx");
const customerNavbarSource = readSource("../src/components/Navbar.tsx");
const customerExperienceSource = readSource("../src/lib/customerExperience.ts");
const footerSource = readSource("../src/components/Footer.tsx");
const homeSource = readSource("../src/pages/HomePage.tsx");

const uniqueMatches = (source, pattern) =>
  new Set([...source.matchAll(pattern)].map((match) => match[1]));

const appRoutes = uniqueMatches(appSource, /<Route\s+path="(\/[^"*:]*)"/g);

const adminRouteStart = appSource.indexOf('<Route path="/admin" element={<AdminLayout />}>');
const adminRouteEnd = appSource.indexOf("</Route>", adminRouteStart);
assert.notEqual(adminRouteStart, -1, "Admin route tree is missing");
assert.notEqual(adminRouteEnd, -1, "Admin route tree is not closed");

const adminRouteTree = appSource.slice(adminRouteStart, adminRouteEnd);
for (const path of uniqueMatches(adminRouteTree, /<Route\s+path="([^"*:]*)"/g)) {
  appRoutes.add(path === "/admin" ? path : `/admin/${path}`);
}

const adminSidebarRoutes = uniqueMatches(
  adminSidebarSource,
  /\{\s*title:\s*"[^"]+",\s*url:\s*"([^"]+)"/g,
);
for (const route of uniqueMatches(adminSidebarSource, /navigate\("(\/admin[^"]*)"\)/g)) {
  adminSidebarRoutes.add(route);
}

const customerSidebarRoutes = uniqueMatches(customerNavbarSource, /<NavItem\s+to="([^"]+)"/g);
for (const route of uniqueMatches(customerNavbarSource, /navigate\("(\/[^"]+)"\)/g)) {
  customerSidebarRoutes.add(route);
}

test("every customer and admin sidebar page has an application route", () => {
  const sidebarRoutes = [...adminSidebarRoutes, ...customerSidebarRoutes];
  const missingRoutes = sidebarRoutes.filter((route) => !appRoutes.has(route));

  assert.deepEqual(missingRoutes, []);
});

test("admin search cannot expose pages outside the admin sidebar scope", () => {
  const searchStart = adminLayoutSource.indexOf("const searchablePages");
  const searchEnd = adminLayoutSource.indexOf("];", searchStart);
  assert.notEqual(searchStart, -1, "Admin search list is missing");
  assert.notEqual(searchEnd, -1, "Admin search list is not closed");

  const searchRoutes = uniqueMatches(
    adminLayoutSource.slice(searchStart, searchEnd),
    /url:\s*"([^"]+)"/g,
  );
  const outsideSidebar = [...searchRoutes].filter((route) => !adminSidebarRoutes.has(route));

  assert.deepEqual(outsideSidebar, []);
});

test("admin access has no development query-string bypass", () => {
  assert.doesNotMatch(adminLayoutSource, /params\.get\(["']dev["']\)/);
  assert.match(adminLayoutSource, /supabase\.auth\.getUser\(\)/);
  assert.match(adminLoginSource, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(adminLoginSource, /supabase\.auth\.getSession\(\)/);
});

test("guest customer state is not treated as an authenticated account", () => {
  assert.match(customerNavbarSource, /customer\?\.userId\s*&&\s*customer\.id\s*!==\s*"guest"/);
  assert.match(customerNavbarSource, /\{isAuthenticatedCustomer\s*\?\s*\(/);
});

test("customer launch links resolve to active routes", () => {
  assert.ok(appRoutes.has("/curated"), "The curated collection route is missing");
  assert.ok(appRoutes.has("/seasonal-offers"), "The seasonal offers route is missing");
  assert.match(homeSource, /link="\/curated"/);
  assert.match(footerSource, /href:\s*"\/seasonal-offers"/);
  assert.doesNotMatch(footerSource, /href:\s*"\/offers"/);
  assert.match(customerExperienceSource, /path:\s*"\/seasonal-offers"/);
});

test("deferred pages outside the current sidebar scope are not routable", () => {
  assert.doesNotMatch(appSource, /<Route\s+path="\/(?:new-season|my-shipments|reset-password)"/);
  assert.doesNotMatch(appSource, /<Route\s+path="(?:catalog-workflow|countries)"/);
  assert.doesNotMatch(customerExperienceSource, /path:\s*"\/(?:new-season|my-shipments)"/);
});

test("brand section routes are registered only once", () => {
  const pluralRouteCount = [...appSource.matchAll(/<Route\s+path="\/brands\/:slug\/sections\/:sectionSlug"/g)].length;
  const singularRouteCount = [...appSource.matchAll(/<Route\s+path="\/brand\/:slug\/sections\/:sectionSlug"/g)].length;

  assert.equal(pluralRouteCount, 1);
  assert.equal(singularRouteCount, 1);
});
