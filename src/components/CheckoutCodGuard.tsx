import { useEffect } from "react";

const isAdenCity = (value: string) => {
  const city = value.trim().toLowerCase();
  return city.includes("عدن") || city.includes("aden");
};

const CheckoutCodGuard = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cityInput: HTMLInputElement | null = null;
    let cleanupInput: (() => void) | null = null;

    const sync = () => {
      if (window.location.pathname !== "/checkout") return;

      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input"));
      const nextCityInput = inputs.find((input) => input.placeholder === "مثال: عدن") || null;

      if (nextCityInput !== cityInput) {
        cleanupInput?.();
        cityInput = nextCityInput;
        if (cityInput) {
          const listener = () => sync();
          cityInput.addEventListener("input", listener);
          cityInput.addEventListener("change", listener);
          cleanupInput = () => {
            cityInput?.removeEventListener("input", listener);
            cityInput?.removeEventListener("change", listener);
          };
        }
      }

      const city = cityInput?.value || "";
      const allowCod = isAdenCity(city);
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const codButton = buttons.find((button) => button.textContent?.includes("الدفع عند الاستلام"));
      const bankButton = buttons.find((button) => button.textContent?.includes("تحويل بنكي أو عبر صراف"));

      if (codButton) {
        codButton.style.display = allowCod ? "" : "none";
        codButton.setAttribute("aria-hidden", allowCod ? "false" : "true");
      }

      if (!allowCod && codButton && bankButton && codButton.querySelector(".bg-\\[\\#D4777D\\]")) {
        bankButton.click();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("popstate", sync);
    const timer = window.setInterval(sync, 500);
    sync();

    return () => {
      observer.disconnect();
      cleanupInput?.();
      window.removeEventListener("popstate", sync);
      window.clearInterval(timer);
    };
  }, []);

  return null;
};

export default CheckoutCodGuard;
