import { supabase } from "@/integrations/supabase/client";

let installed = false;
let actionSheet: HTMLDivElement | null = null;
const isAccount = () => window.location.pathname === "/account";

const storedCustomer = () => {
  try { return JSON.parse(localStorage.getItem("customer") || "{}"); } catch { return {}; }
};

const syncAvatarImages = (url = "") => {
  document.querySelectorAll<HTMLImageElement>("img[alt='معاينة الصورة'], img[alt='الصورة الشخصية']").forEach((img) => {
    if (url) img.src = url;
    else img.replaceWith(Object.assign(document.createElement("span"), { textContent: "" }));
  });
};

const closeSheet = () => {
  actionSheet?.remove();
  actionSheet = null;
};

const showAvatarActions = (form: HTMLFormElement, fileInput: HTMLInputElement) => {
  closeSheet();
  const hasAvatar = Boolean(storedCustomer()?.avatar_url || form.querySelector("img[alt='معاينة الصورة']"));
  const sheet = document.createElement("div");
  actionSheet = sheet;
  sheet.dir = "rtl";
  sheet.style.cssText = "position:fixed;inset:0;z-index:10050;background:rgba(28,23,21,.35);display:flex;align-items:flex-end;justify-content:center;padding:12px 12px calc(env(safe-area-inset-bottom) + 12px);overscroll-behavior:none;touch-action:none;";
  sheet.innerHTML = `<div data-panel style="width:100%;max-width:440px;display:grid;gap:8px;touch-action:auto">
    <div style="overflow:hidden;border-radius:18px;background:#fff">
      <button data-change type="button" style="width:100%;height:54px;border:0;background:#fff;color:#403230;font:600 15px inherit">تغيير الصورة</button>
      ${hasAvatar ? '<div style="height:1px;background:#eee5e2"></div><button data-delete type="button" style="width:100%;height:54px;border:0;background:#fff;color:#c64f58;font:700 15px inherit">حذف الصورة الشخصية</button>' : ''}
    </div>
    <button data-cancel type="button" style="width:100%;height:52px;border:0;border-radius:18px;background:#fff;color:#655854;font:600 15px inherit">إلغاء</button>
  </div>`;
  document.body.appendChild(sheet);

  sheet.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  sheet.querySelector("[data-cancel]")?.addEventListener("click", closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });
  sheet.querySelector("[data-change]")?.addEventListener("click", () => { closeSheet(); fileInput.click(); });
  sheet.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!window.confirm("هل تريد حذف الصورة الشخصية؟")) return;
    const button = sheet.querySelector<HTMLButtonElement>("[data-delete]");
    if (button) { button.disabled = true; button.textContent = "جاري الحذف..."; }
    const { data, error } = await (supabase as any).rpc("customer_clear_avatar");
    if (error) {
      if (button) { button.disabled = false; button.textContent = "تعذر الحذف - حاول مجددًا"; }
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

    // The account sheet already fits the iPhone viewport. Do not turn the form
    // into a nested scroller: nested scrolling was causing Safari rubber-band
    // movement and a visible up/down jump when the avatar sheet was opened.
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
    holder.setAttribute("role", "button");
    holder.setAttribute("aria-label", "خيارات الصورة الشخصية");
    holder.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showAvatarActions(form, input);
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
