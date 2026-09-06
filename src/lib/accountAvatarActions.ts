import { supabase } from "@/integrations/supabase/client";

let installed = false;
let actionMenu: HTMLDivElement | null = null;
let outsideHandler: ((event: Event) => void) | null = null;

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

const closeMenu = () => {
  actionMenu?.remove();
  actionMenu = null;
  if (outsideHandler) {
    document.removeEventListener("pointerdown", outsideHandler, true);
    outsideHandler = null;
  }
};

const showAvatarActions = (form: HTMLFormElement, fileInput: HTMLInputElement, anchor: HTMLElement) => {
  closeMenu();

  const hasAvatar = Boolean(storedCustomer()?.avatar_url || form.querySelector("img[alt='معاينة الصورة']"));
  const host = anchor.parentElement as HTMLElement | null;
  if (!host) return;

  const previousPosition = host.style.position;
  if (!previousPosition || previousPosition === "static") host.style.position = "relative";

  const menu = document.createElement("div");
  actionMenu = menu;
  menu.dir = "rtl";
  menu.dataset.avatarActionsMenu = "1";
  menu.style.cssText = [
    "position:absolute",
    "z-index:10060",
    "top:calc(100% + 8px)",
    "left:50%",
    "width:min(250px,calc(100vw - 40px))",
    "transform:translateX(-50%)",
    "overflow:hidden",
    "border:1px solid #eee2de",
    "border-radius:16px",
    "background:#fff",
    "box-shadow:0 12px 30px rgba(49,35,31,.16)",
    "touch-action:manipulation",
    "contain:layout paint style",
  ].join(";");

  menu.innerHTML = `
    <button data-change type="button" style="display:block;width:100%;height:48px;border:0;background:#fff;color:#403230;font:600 14px inherit">تغيير الصورة</button>
    ${hasAvatar ? '<div style="height:1px;background:#eee5e2"></div><button data-delete type="button" style="display:block;width:100%;height:48px;border:0;background:#fff;color:#c64f58;font:700 14px inherit">حذف الصورة الشخصية</button>' : ""}
    <div style="height:1px;background:#eee5e2"></div>
    <button data-cancel type="button" style="display:block;width:100%;height:44px;border:0;background:#fff;color:#7a6d68;font:600 13px inherit">إلغاء</button>
  `;

  host.appendChild(menu);

  menu.querySelector("[data-cancel]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
  });

  menu.querySelector("[data-change]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    fileInput.click();
  });

  menu.querySelector("[data-delete]")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm("هل تريد حذف الصورة الشخصية؟")) return;

    const button = menu.querySelector<HTMLButtonElement>("[data-delete]");
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
    closeMenu();
    window.location.reload();
  });

  outsideHandler = (event: Event) => {
    const target = event.target as Node | null;
    if (!target || menu.contains(target) || anchor.contains(target)) return;
    closeMenu();
  };

  window.setTimeout(() => {
    if (outsideHandler) document.addEventListener("pointerdown", outsideHandler, true);
  }, 0);
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
    holder.setAttribute("role", "button");
    holder.setAttribute("aria-label", "خيارات الصورة الشخصية");

    holder.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (actionMenu) {
        closeMenu();
        return;
      }
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
