import { useEffect } from "react";
import "@/admin-action-colors.css";

const PINK_CLASS = "admin-normalized-pink-action";

const parseRgb = (value: string) => {
  const match = value.match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
};

const looksPink = (element: HTMLElement) => {
  const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
  if (/bg-(pink|rose)-/.test(className)) return true;

  const background = parseRgb(window.getComputedStyle(element).backgroundColor);
  if (!background) return false;

  const { r, g, b } = background;
  const saturatedPink = r >= 180 && r - g >= 35 && b - g >= 8 && b >= 105;
  const palePink = r >= 235 && g >= 170 && g <= 225 && b >= 185 && b - g >= 4;
  return saturatedPink || palePink;
};

const normalize = () => {
  if (!window.location.pathname.startsWith("/admin")) return;

  document.querySelectorAll<HTMLElement>("button, a[role='button'], a[class]").forEach((element) => {
    if (element.closest("[data-admin-preserve-action-color='true']")) return;
    if (looksPink(element)) element.classList.add(PINK_CLASS);
    else element.classList.remove(PINK_CLASS);
  });
};

const AdminThemeActionCleanup = () => {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(normalize);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
      document.querySelectorAll(`.${PINK_CLASS}`).forEach((element) => element.classList.remove(PINK_CLASS));
    };
  }, []);

  return null;
};

export default AdminThemeActionCleanup;
