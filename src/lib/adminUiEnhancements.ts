import "@/admin-action-colors.css";
import { toast } from "@/hooks/use-toast";
import { exportAdminPageData, getAdminExportDefinition } from "@/lib/adminDataExport";

const EXPORT_ID = "admin-global-excel-export";
const PINK_CLASS = "admin-normalized-pink-action";

const parseRgb = (value: string) => {
  const match = value.match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
};

const looksPink = (element: HTMLElement) => {
  if (element.classList.contains(PINK_CLASS)) return true;

  const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
  if (/bg-(pink|rose)-/.test(className)) return true;

  const background = parseRgb(window.getComputedStyle(element).backgroundColor);
  if (!background) return false;

  const { r, g, b } = background;
  const saturatedPink = r >= 180 && r - g >= 35 && b - g >= 8 && b >= 105;
  const palePink = r >= 235 && g >= 170 && g <= 225 && b >= 185 && b - g >= 4;
  return saturatedPink || palePink;
};

const normalizePinkActions = () => {
  if (!window.location.pathname.startsWith("/admin")) return;

  document.querySelectorAll<HTMLElement>("button, a[role='button'], a[class]").forEach((element) => {
    if (element.id === EXPORT_ID || element.closest("[data-admin-preserve-action-color='true']")) return;
    if (looksPink(element)) element.classList.add(PINK_CLASS);
  });
};

const exportIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`;
const loadingIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" class="admin-export-spinner"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>`;

const findAdminTopActions = () => {
  const workspace = document.querySelector<HTMLElement>(".admin-workspace");
  if (!workspace) return null;
  const sidebarInset = workspace.querySelector<HTMLElement>("[data-sidebar='inset']") || workspace.querySelector<HTMLElement>("main")?.parentElement;
  const header = sidebarInset?.querySelector<HTMLElement>(":scope > header") || workspace.querySelector<HTMLElement>("header");
  if (!header) return null;
  const candidates = Array.from(header.querySelectorAll<HTMLElement>("div"));
  return candidates.find((node) => node.className.includes("mr-auto") && node.className.includes("items-center")) || null;
};

const syncExportButton = () => {
  const definition = getAdminExportDefinition(window.location.pathname);
  const existing = document.getElementById(EXPORT_ID) as HTMLButtonElement | null;

  if (!definition) {
    existing?.remove();
    return;
  }

  const target = findAdminTopActions();
  if (!target) return;
  if (existing && existing.parentElement === target) return;
  existing?.remove();

  const button = document.createElement("button");
  button.id = EXPORT_ID;
  button.type = "button";
  button.className = "admin-global-excel-export";
  button.title = "تصدير Excel";
  button.setAttribute("aria-label", "تصدير البيانات إلى Excel");
  button.innerHTML = `${exportIcon}<span>تصدير Excel</span>`;

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.innerHTML = `${loadingIcon}<span>جاري التصدير...</span>`;
    try {
      const count = await exportAdminPageData(window.location.pathname);
      toast({
        title: "تم تجهيز ملف Excel",
        description: count > 0 ? `تم تصدير ${count.toLocaleString("ar-EG")} صف في أعمدة مرتبة.` : "تم إنشاء الملف بالعناوين ولا توجد بيانات حالياً.",
      });
    } catch (error: any) {
      console.error("[admin-excel-export]", error);
      toast({
        title: "تعذر تصدير Excel",
        description: error?.message || "حدث خطأ أثناء تجهيز الملف.",
        variant: "destructive",
      });
    } finally {
      button.disabled = false;
      button.innerHTML = `${exportIcon}<span>تصدير Excel</span>`;
    }
  });

  target.prepend(button);
};

const sync = () => {
  if (!window.location.pathname.startsWith("/admin")) {
    document.getElementById(EXPORT_ID)?.remove();
    document.querySelectorAll(`.${PINK_CLASS}`).forEach((element) => element.classList.remove(PINK_CLASS));
    return;
  }
  syncExportButton();
  normalizePinkActions();
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const start = () => {
    let frame = 0;
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("popstate", schedule);
    window.addEventListener("hashchange", schedule);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
