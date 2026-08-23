import "@/admin-action-colors.css";
import { toast } from "@/hooks/use-toast";
import { exportAdminPageData, getAdminExportDefinition } from "@/lib/adminDataExport";
import { exportAdditionalAdminPageData, getAdditionalAdminExportDefinition } from "@/lib/adminAdditionalDataExport";

const EXPORT_ID = "admin-global-excel-export";
const PINK_SOLID_CLASS = "admin-normalized-pink-action";
const PINK_SOFT_CLASS = "admin-normalized-pink-soft-action";
const PINK_TEXT_CLASS = "admin-normalized-pink-text-action";
const NORMALIZED_CLASSES = [PINK_SOLID_CLASS, PINK_SOFT_CLASS, PINK_TEXT_CLASS] as const;

type PinkMode = "solid" | "soft" | "text";

const parseRgb = (value: string) => {
  const match = value.match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
};

const isSaturatedPink = ({ r, g, b }: { r: number; g: number; b: number }) => r >= 180 && r - g >= 35 && b >= 105 && b - g >= 0;
const isPalePink = ({ r, g, b }: { r: number; g: number; b: number }) => r >= 235 && g >= 170 && g <= 225 && b >= 185 && b - g >= 4;

const existingMode = (element: HTMLElement): PinkMode | null => {
  if (element.classList.contains(PINK_SOLID_CLASS)) return "solid";
  if (element.classList.contains(PINK_SOFT_CLASS)) return "soft";
  if (element.classList.contains(PINK_TEXT_CLASS)) return "text";
  return null;
};

const detectPinkMode = (element: HTMLElement): PinkMode | null => {
  const normalized = existingMode(element);
  if (normalized) return normalized;

  const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
  const style = window.getComputedStyle(element);
  const background = parseRgb(style.backgroundColor);
  const foreground = parseRgb(style.color);

  if (background && isSaturatedPink(background)) return "solid";
  if (background && isPalePink(background)) return "soft";
  if (foreground && isSaturatedPink(foreground)) return "text";
  if (/bg-(pink|rose)-/.test(className)) return "soft";
  if (/(text|border)-(pink|rose)-/.test(className)) return "text";
  return null;
};

const normalizePinkActions = () => {
  if (!window.location.pathname.startsWith("/admin")) return;

  document.querySelectorAll<HTMLElement>("button, a[role='button'], a[class]").forEach((element) => {
    if (element.id === EXPORT_ID || element.closest("[data-admin-preserve-action-color='true']")) return;
    const mode = detectPinkMode(element);
    if (mode === "solid") element.classList.add(PINK_SOLID_CLASS);
    if (mode === "soft") element.classList.add(PINK_SOFT_CLASS);
    if (mode === "text") element.classList.add(PINK_TEXT_CLASS);
  });
};

const exportIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`;
const loadingIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" class="admin-export-spinner"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>`;

const getDefinition = (pathname: string) => getAdminExportDefinition(pathname) || getAdditionalAdminExportDefinition(pathname);

const runExport = async (pathname: string) => {
  if (getAdminExportDefinition(pathname)) return exportAdminPageData(pathname);
  return exportAdditionalAdminPageData(pathname);
};

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
  const definition = getDefinition(window.location.pathname);
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
    const pathname = window.location.pathname;
    button.disabled = true;
    button.innerHTML = `${loadingIcon}<span>جاري التصدير...</span>`;
    try {
      const count = await runExport(pathname);
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

const clearNormalization = () => {
  NORMALIZED_CLASSES.forEach((className) => {
    document.querySelectorAll(`.${className}`).forEach((element) => element.classList.remove(className));
  });
};

const sync = () => {
  if (!window.location.pathname.startsWith("/admin")) {
    document.getElementById(EXPORT_ID)?.remove();
    clearNormalization();
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
