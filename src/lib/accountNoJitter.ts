let installed = false;

const isAccount = () => window.location.pathname === "/account";

const hasEditSheet = () => {
  if (!isAccount()) return false;
  return Array.from(document.querySelectorAll("form")).some((form) => form.textContent?.includes("حفظ التغييرات"));
};

/**
 * AccountPage writes `document.body.style.overflow = "hidden"` whenever the
 * profile/region sheets open. Mobile Safari recalculates its visual viewport
 * when that inline value changes, even if another CSS rule later overrides the
 * computed overflow. That recalculation is the small visible jump in the screen
 * recording.
 *
 * Install a narrowly-scoped guard before React mounts. It only ignores the
 * exact body overflow:hidden write while the current route is /account. Other
 * elements, routes and overflow values keep their native behaviour.
 */
const installBodyOverflowGuard = () => {
  if (typeof CSSStyleDeclaration === "undefined") return;

  const prototype = CSSStyleDeclaration.prototype as CSSStyleDeclaration & {
    __flamingoAccountOverflowGuard?: boolean;
  };

  if (prototype.__flamingoAccountOverflowGuard) return;

  const descriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, "overflow");
  if (!descriptor?.get || !descriptor?.set || descriptor.configurable === false) return;

  const nativeGet = descriptor.get;
  const nativeSet = descriptor.set;

  try {
    Object.defineProperty(CSSStyleDeclaration.prototype, "overflow", {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get() {
        return nativeGet.call(this);
      },
      set(value: string) {
        const isAccountBody =
          isAccount() &&
          typeof document !== "undefined" &&
          document.body &&
          this === document.body.style;

        if (isAccountBody && String(value).trim().toLowerCase() === "hidden") {
          return;
        }

        nativeSet.call(this, value);
      },
    });

    Object.defineProperty(prototype, "__flamingoAccountOverflowGuard", {
      configurable: true,
      value: true,
    });
  } catch {
    // Old/WebKit implementations can expose non-patchable style descriptors.
    // The preloaded CSS below remains the safe fallback in that case.
  }
};

const installStyle = () => {
  if (document.getElementById("flamingo-account-no-jitter")) return;

  const style = document.createElement("style");
  style.id = "flamingo-account-no-jitter";
  style.textContent = `
    @media (max-width: 767px) {
      html, body {
        overflow-anchor: none;
      }

      /* Keep document geometry unchanged while the account sheet exists. */
      body:has(div[class*="z-[90]"][class*="rounded-t-[26px]"][class*="bottom-0"]) {
        overflow: visible !important;
        position: static !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        width: auto !important;
      }

      /* Profile sheet: no first/last transform frame and no compositor tween. */
      div[class*="z-[90]"][class*="rounded-t-[26px]"][class*="bottom-0"] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
        will-change: auto !important;
      }

      /* Backdrop must appear/disappear in the same paint as the sheet. */
      button[class*="z-[80]"][class*="inset-0"] {
        opacity: 1 !important;
        transition: none !important;
        animation: none !important;
        will-change: auto !important;
      }

      /* Nested region picker follows the same stable rules. */
      div[class*="z-[120]"][class*="rounded-t-[26px]"][class*="bottom-0"] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
        will-change: auto !important;
      }

      button[class*="z-[110]"][class*="inset-0"] {
        opacity: 1 !important;
        transition: none !important;
        animation: none !important;
        will-change: auto !important;
      }
    }
  `;

  document.head.appendChild(style);
};

const preventBackgroundGesture = (event: TouchEvent) => {
  if (!hasEditSheet()) return;

  const target = event.target as HTMLElement | null;
  if (target?.closest("[data-stage], input[type='range'], input, textarea, button, [data-avatar-actions-menu]")) return;

  event.preventDefault();
};

export const installAccountNoJitter = () => {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  installBodyOverflowGuard();
  installStyle();

  document.addEventListener("touchmove", preventBackgroundGesture, { capture: true, passive: false });
};

installAccountNoJitter();
