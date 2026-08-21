import "../admin-products-mobile.css";

const LIST_CLASS = "admin-products-mobile-list";
const EDITOR_CLASS = "admin-products-mobile-editor";
const HEADER_ATTR = "data-admin-products-page-header";

const normalizePath = () => {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
};

const markPageHeader = () => {
  document.querySelectorAll(`[${HEADER_ATTR}]`).forEach((node) => node.removeAttribute(HEADER_ATTR));

  if (!document.body.classList.contains(LIST_CLASS) && !document.body.classList.contains(EDITOR_CLASS)) return;

  const expectedTitles = document.body.classList.contains(LIST_CLASS)
    ? new Set(["إدارة المنتجات"])
    : new Set(["إضافة منتج جديد", "تعديل المنتج"]);

  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>("header h1"))
    .find((node) => expectedTitles.has(node.textContent?.trim() || ""));

  heading?.closest("header")?.setAttribute(HEADER_ATTR, "true");
};

const syncRouteClasses = () => {
  const path = normalizePath();
  const isList = path === "/admin/products";
  const isEditor = path === "/admin/products/new" || /^\/admin\/products\/[^/]+$/.test(path);

  document.body.classList.toggle(LIST_CLASS, isList);
  document.body.classList.toggle(EDITOR_CLASS, isEditor);

  requestAnimationFrame(markPageHeader);
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const start = () => {
    syncRouteClasses();

    const observer = new MutationObserver(() => syncRouteClasses());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("popstate", syncRouteClasses);
    window.addEventListener("hashchange", syncRouteClasses);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
