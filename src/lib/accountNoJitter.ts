let installed = false;

const isAccount = () => window.location.pathname === "/account";
const hasEditSheet = () => {
  if (!isAccount()) return false;
  return Array.from(document.querySelectorAll("form")).some((form) => form.textContent?.includes("حفظ التغييرات"));
};

const installStyle = () => {
  if (document.getElementById("flamingo-account-no-jitter")) return;

  const style = document.createElement("style");
  style.id = "flamingo-account-no-jitter";
  style.textContent = `
    @media (max-width: 767px) {
      /* AccountPage writes overflow:hidden inline when this exact sheet exists.
         :has() keeps the override scoped to the account sheet and is evaluated
         by the browser in the same style pass, before any visible jump. */
      body:has(div[class*="z-[90]"][class*="rounded-t-[26px]"][class*="bottom-0"]) {
        overflow: visible !important;
        position: static !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        width: auto !important;
      }

      /* Disable the mobile y:100% Framer Motion frame before first paint. */
      div[class*="z-[90]"][class*="rounded-t-[26px]"][class*="bottom-0"] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }

      /* Nested region picker uses the same bottom-sheet animation. */
      div[class*="z-[120]"][class*="rounded-t-[26px]"][class*="bottom-0"] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
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

  installStyle();
  document.addEventListener("touchmove", preventBackgroundGesture, { capture: true, passive: false });
};

installAccountNoJitter();
