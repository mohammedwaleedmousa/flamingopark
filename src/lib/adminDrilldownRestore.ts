const DRILLDOWN_VIEW_ID = "admin-dashboard-drilldown-view";
const STATUS_KEYS = new Set(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
const FUNNEL_KEYS = new Set(["visitors", "cart", "checkout", "purchases"]);

const isActiveDrilldownRoute = () => {
  if (!window.location.pathname.startsWith("/admin")) return false;

  const params = new URLSearchParams(window.location.search);

  if (window.location.pathname === "/admin/reports/customers" && FUNNEL_KEYS.has(params.get("funnel") || "")) {
    return true;
  }

  if (window.location.pathname === "/admin/orders" && STATUS_KEYS.has(params.get("status") || "")) {
    return true;
  }

  if (window.location.pathname === "/admin/inventory-adjustments" && params.get("view") === "low-stock") {
    return true;
  }

  return false;
};

const restoreOriginalAdminPage = () => {
  if (!window.location.pathname.startsWith("/admin") || window.location.pathname === "/admin/login") return;
  if (isActiveDrilldownRoute()) return;

  document.getElementById(DRILLDOWN_VIEW_ID)?.remove();

  const shell = document.querySelector<HTMLElement>(".admin-page-scroll > div");
  if (!shell) return;

  Array.from(shell.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.id === DRILLDOWN_VIEW_ID) return;
    if (child.style.display === "none") child.style.display = "";
  });
};

const scheduleRestore = () => window.requestAnimationFrame(restoreOriginalAdminPage);

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const nativePushState = window.history.pushState.bind(window.history);
  const nativeReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = (...args) => {
    nativePushState(...args);
    scheduleRestore();
  };

  window.history.replaceState = (...args) => {
    nativeReplaceState(...args);
    scheduleRestore();
  };

  window.addEventListener("popstate", scheduleRestore);

  const observer = new MutationObserver(scheduleRestore);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleRestore, { once: true });
  } else {
    scheduleRestore();
  }
}
