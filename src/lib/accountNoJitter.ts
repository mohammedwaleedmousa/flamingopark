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
    html[data-flamingo-account="true"] body {
      overflow: visible !important;
      width: auto !important;
      position: static !important;
      top: auto !important;
      left: auto !important;
      right: auto !important;
    }

    html[data-flamingo-account="true"] body[data-account-scroll-locked="true"] {
      overflow: visible !important;
      position: static !important;
      top: auto !important;
      left: auto !important;
      right: auto !important;
      width: auto !important;
    }

    @media (max-width: 767px) {
      html[data-flamingo-account="true"] [data-account-edit-sheet] {
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
};

const markAccount = () => {
  if (isAccount()) document.documentElement.dataset.flamingoAccount = "true";
  else delete document.documentElement.dataset.flamingoAccount;
};

const markEditSheet = () => {
  if (!isAccount()) return;
  document.querySelectorAll<HTMLElement>("form").forEach((form) => {
    if (!form.textContent?.includes("حفظ التغييرات")) return;
    const sheet = form.parentElement;
    if (sheet) sheet.dataset.accountEditSheet = "1";
  });
};

const preventBackgroundGesture = (event: TouchEvent) => {
  if (!hasEditSheet()) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("[data-stage], input[type='range']")) return;
  event.preventDefault();
};

export const installAccountNoJitter = () => {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  installStyle();
  markAccount();
  markEditSheet();

  const observer = new MutationObserver(() => {
    markAccount();
    markEditSheet();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("touchmove", preventBackgroundGesture, { capture: true, passive: false });
  window.addEventListener("popstate", markAccount);
  window.addEventListener("pageshow", markAccount);
};

installAccountNoJitter();
