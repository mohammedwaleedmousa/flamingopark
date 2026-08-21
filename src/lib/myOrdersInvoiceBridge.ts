const BRIDGE_SELECTOR = "[data-my-orders-invoice-bridge]";

const isMyOrdersInvoiceButton = (button: HTMLButtonElement) => {
  if (window.location.pathname !== "/my-orders") return false;
  if (!button.textContent?.includes("عرض الفاتورة")) return false;

  const article = button.closest("article");
  return Boolean(article?.querySelector('span[dir="ltr"].font-mono'));
};

const keepMyOrdersBackLabel = () => {
  if (window.location.pathname !== "/my-orders") return;

  const backLabel = document.querySelector<HTMLElement>("#account-invoice-overlay [data-account-invoice-back] span:last-child");
  if (backLabel && backLabel.textContent !== "العودة إلى طلباتي") {
    backLabel.textContent = "العودة إلى طلباتي";
  }
};

const enableMyOrdersInvoiceButtons = () => {
  if (window.location.pathname !== "/my-orders") return;

  document.querySelectorAll<HTMLButtonElement>("main button").forEach((button) => {
    if (!isMyOrdersInvoiceButton(button)) return;

    if (button.disabled) button.disabled = false;
    button.removeAttribute("disabled");
  });

  keepMyOrdersBackLabel();
};

const openThroughAccountInvoiceRenderer = (orderNumber: string) => {
  document.querySelector(BRIDGE_SELECTOR)?.remove();

  const bridge = document.createElement("div");
  bridge.id = "account-orders";
  bridge.hidden = true;
  bridge.setAttribute("data-my-orders-invoice-bridge", "true");

  const row = document.createElement("div");
  row.className = "justify-between";

  const order = document.createElement("p");
  order.textContent = orderNumber;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "عرض الفاتورة";

  row.append(order, button);
  bridge.appendChild(row);
  document.body.appendChild(bridge);

  button.click();

  if (bridge.isConnected) bridge.remove();
  keepMyOrdersBackLabel();
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  enableMyOrdersInvoiceButtons();

  const observer = new MutationObserver(() => {
    enableMyOrdersInvoiceButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled"],
  });

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement) || !isMyOrdersInvoiceButton(button)) return;

      const article = button.closest("article");
      const orderNumber = article?.querySelector<HTMLElement>('span[dir="ltr"].font-mono')?.textContent?.trim() || "";
      if (!orderNumber) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openThroughAccountInvoiceRenderer(orderNumber);
    },
    true,
  );
}
