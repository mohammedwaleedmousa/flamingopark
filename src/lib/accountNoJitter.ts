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
    body {
      scrollbar-gutter: stable;
    }

    @media (max-width: 767px) {
      /* AccountPage applies overflow:hidden inline while its sheets are open.
         Keep the document geometry unchanged on iOS Safari. */
      body {
        overflow: visible !important;
        position: static !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        width: auto !important;
      }

      /* Match the profile sheet from its permanent Tailwind classes. This CSS
         already exists before React mounts the sheet, so Framer Motion never
         gets a visible y:100% first frame on phones. */
      div[class*="z-[90]"][class*="rounded-t-[26px]"][class*="bottom-0"] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }

      /* Same rule for the nested region picker. */
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
