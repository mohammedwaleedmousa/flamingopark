import { supabase } from "@/integrations/supabase/client";

let installed = false;
let actionSheet: HTMLDivElement | null = null;
const isAccount = () => window.location.pathname === "/account";

const storedCustomer = () => {
  try {
    return JSON.parse(localStorage.getItem("customer") || "{}");
  } catch {
    return {};
  }
};

const syncAvatarImages = (url = "") => {
  document
    .querySelectorAll<HTMLImageElement>("img[alt='معاينة الصورة'], img[alt='الصورة الشخصية']")
    .forEach((img) => {
      if (url) img.src = url;
      else img.replaceWith(Object.assign(document.createElement("span"), { textContent: "" }));
    });
};

const closeSheet = () => {
  actionSheet?.remove();
  actionSheet = null;
};

const showAvatarActions = (form: HTMLFormElement, fileInput: HTMLInputElement, anchor: HTMLElement) => {
  closeSheet();

  const hasAvatar = Boolean(storedCustomer()?.avatar_url || form.querySelector("img[alt='معاينة الصورة']"));
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.visualViewport?.height || document.documentElement.clientHeight;
  const panelWidth = Math.min(270, Math.max(230, viewportWidth - 32));
  const panelHeight = hasAvatar ? 142 : 93;
  const desiredLeft = rect.left + rect.width / 2 - panelWidth / 2;
  const left = Math.max(16, Math.min(viewportWidth - panelWidth - 16, desiredLeft));
  const belowTop = rect.bottom + 8;
  const aboveTop = rect.top - panelHeight - 8;
  const top = belowTop + panelHeight <= viewportHeight - 12 ? belowTop : Math.max(12, aboveTop);

  const sheet = document.createElement("div");
  actionSheet = sheet;
  sheet.dir = "rtl";
  sheet.dataset.avatarActionsOverlay = "1";
  sheet.style.cssText =
    "position:fixed;inset:0;z-index:10050;background:rgba(28,23,21,.14);touch-action:none;overscroll-behavior:none;";
  sheet.innerHTML = `
    <div data-panel style="position:fixed;left:${left}px;top:${top}px;width:${panelWidth}px;overflow:hidden;border:1px solid #eee2de;border-radius:16px;background:#fff;box-shadow:0 12px 34px rgba(49,35,31,.18);touch-action:manipulation">
      <button data-change type="button" style="display:block;width:100%;height:48px;border:0;background:#fff;color:#403230;font:600 14px inherit">تغيير الصورة</button>
      ${hasAvatar ? '<div style="height:1px;background:#eee5e2"></div><button data-delete type="button" style="display:block;width:100%;height:48px;border:0;background:#fff;color:#c64f58;font:700 14px inherit">حذف الصورة الشخصية</button>' : ""}
      <div style="height:1px;background:#eee5e2"></div>
      <button data-cancel type="button" style="display:block;width:100%;height:44px;border:0;background:#fff;color:#7a6d68;font:600 13px inherit">إلغاء</button>
    </div>`;

  document.body.appendChild(sheet);

  sheet.addEventListener(
    "touchmove",
    (event) => {
      if (event.target === sheet) event.preventDefault();
    },
    { passive: false },
  );

  sheet.querySelector("[data-cancel]")?.addEventListener("click", closeSheet);
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) closeSheet();
  });

  sheet.querySelector("[data-change]")?.addEventListener("click", () => {
    closeSheet();
    fileInput.click();
  });

  sheet.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!window.confirm("هل تريد حذف الصورة الشخصية؟")) return;

    const button = sheet.querySelector<HTMLButtonElement>("[data-delete]");
    if (button) {
      button.disabled = true;
      button.textContent = "جاري الحذف...";
    }

    const { data, error } = await (supabase as any).rpc("customer_clear_avatar");
    if (error) {
      if (button) {
        button.disabled = false;
        button.textContent = "تعذر الحذف - حاول مجددًا";
      }
      return;
    }

    const current = storedCustomer();
    const fresh = Array.isArray(data) && data[0] ? data[0] : { ...current, avatar_url: null };
    localStorage.setItem("customer", JSON.stringify(fresh));
    syncAvatarImages("");
    closeSheet();
    window.location.reload();
  });
};

const enhanceEditSheet = () => {
  if (!isAccount()) return;

  document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    if (!form.textContent?.includes("حفظ التغييرات")) return;

    form.style.maxHeight = "none";
    form.style.overflow = "hidden";
    form.style.overscrollBehavior = "none";
    form.style.touchAction = "manipulation";
    (form.style as any).webkitOverflowScrolling = "auto";
    form.style.paddingBottom = "max(24px, env(safe-area-inset-bottom))";

    const input = form.querySelector<HTMLInputElement>("input[type='file']");
    if (!input) return;

    const avatar = form.querySelector<HTMLImageElement>("img[alt='معاينة الصورة']");
    const holder = avatar?.parentElement || form.querySelector<HTMLElement>(".h-\\[82px\\].w-\\[82px\\]");
    if (!holder || holder.dataset.avatarActionsReady === "1") return;

    holder.dataset.avatarActionsReady = "1";
    holder.style.cursor = "pointer";
    holder.style.touchAction = "manipulation";
    holder.setAttribute("role", "button");
    holder.setAttribute("aria-label", "خيارات الصورة الشخصية");

    holder.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showAvatarActions(form, input, holder);
    });
  });
};

export const installAccountAvatarActions = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  enhanceEditSheet();
  const observer = new MutationObserver(enhanceEditSheet);
  observer.observe(document.documentElement, { childList: true, subtree: true });
};

installAccountAvatarActions();
