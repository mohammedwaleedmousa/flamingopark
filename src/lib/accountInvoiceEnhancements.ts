import { supabase } from "@/integrations/supabase/client";
import { optimizeImage } from "@/lib/imageUrl";

const OVERLAY_ID = "account-invoice-overlay";
const BODY_CLASS = "account-invoice-visible";
const STYLE_ID = "account-invoice-enhancements-style";

let pendingOrderNumber = "";
let hydrationRun = 0;

type OrderItem = {
  product_id?: string | null;
  product_image?: string | null;
  selected_color?: string | null;
};

type ProductRow = {
  id: string;
  images?: unknown;
  color_variants?: unknown;
};

type ColorVariant = {
  name?: string | null;
  images?: unknown;
};

const normalizeImage = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  try {
    const optimized = optimizeImage(raw, 180, 76);
    if (optimized.startsWith("/")) return `${window.location.origin}${optimized}`;
    return /^https?:\/\//i.test(optimized) ? optimized : "";
  } catch {
    return "";
  }
};

const stringImages = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.filter((image): image is string => typeof image === "string" && image.trim().length > 0);
};

const productImageForItem = (product: ProductRow | undefined, item: OrderItem) => {
  if (!product) return "";

  const variants = Array.isArray(product.color_variants) ? (product.color_variants as ColorVariant[]) : [];
  const selectedColor = String(item.selected_color || "").trim().toLocaleLowerCase("ar");

  const selectedVariant = selectedColor
    ? variants.find((variant) => String(variant?.name || "").trim().toLocaleLowerCase("ar") === selectedColor)
    : undefined;

  const selectedVariantImage = stringImages(selectedVariant?.images)[0];
  if (selectedVariantImage) return normalizeImage(selectedVariantImage);

  const firstVariantImage = variants.flatMap((variant) => stringImages(variant?.images))[0];
  if (firstVariantImage) return normalizeImage(firstVariantImage);

  return normalizeImage(stringImages(product.images)[0]);
};

const ensureStyle = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
body.${BODY_CLASS} #root main,
body.${BODY_CLASS} #root footer {
  visibility: hidden !important;
}
body.${BODY_CLASS} {
  overflow: hidden !important;
  background: #fffdfc !important;
}
#${OVERLAY_ID} {
  position: fixed !important;
  top: calc(112px + env(safe-area-inset-top)) !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  z-index: 45 !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  background: #fffdfc !important;
  isolation: isolate !important;
  opacity: 1 !important;
}
#${OVERLAY_ID}::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: #fffdfc;
  pointer-events: none;
}
@supports (height: 100dvh) {
  #${OVERLAY_ID} {
    height: calc(100dvh - 112px - env(safe-area-inset-top)) !important;
    bottom: auto !important;
  }
}
@media (min-width: 768px) {
  #${OVERLAY_ID} {
    top: 120px !important;
  }
  @supports (height: 100dvh) {
    #${OVERLAY_ID} {
      height: calc(100dvh - 120px) !important;
    }
  }
}
@media print {
  body.${BODY_CLASS} #root main,
  body.${BODY_CLASS} #root footer {
    visibility: visible !important;
  }
  #${OVERLAY_ID}::before {
    display: none !important;
  }
}
`;

  document.head.appendChild(style);
};

const waitForInvoiceImages = async (overlay: HTMLElement) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const images = overlay.querySelectorAll<HTMLImageElement>(".product-image img");
    if (images.length > 0) return Array.from(images);
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return [] as HTMLImageElement[];
};

const hydrateMissingProductImages = async (overlay: HTMLElement, orderNumber: string, runId: number) => {
  if (!orderNumber) return;

  try {
    const { data: order, error: orderError } = await (supabase as any)
      .from("orders")
      .select("items")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderError || !order || runId !== hydrationRun || !document.body.contains(overlay)) return;

    const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
    const productIds = Array.from(
      new Set(
        items
          .map((item) => (typeof item.product_id === "string" ? item.product_id.trim() : ""))
          .filter(Boolean),
      ),
    );

    if (!productIds.length) return;

    const { data: products, error: productsError } = await (supabase as any)
      .from("products")
      .select("id,images,color_variants")
      .in("id", productIds);

    if (productsError || runId !== hydrationRun || !document.body.contains(overlay)) return;

    const productMap = new Map<string, ProductRow>((products || []).map((product: ProductRow) => [product.id, product]));
    const imageElements = await waitForInvoiceImages(overlay);

    if (runId !== hydrationRun || !document.body.contains(overlay)) return;

    imageElements.forEach((imageElement, index) => {
      const item = items[index];
      if (!item) return;

      const snapshotImage = normalizeImage(item.product_image);
      const fallbackImage = productImageForItem(productMap.get(String(item.product_id || "")), item);
      const currentIsPlaceholder = imageElement.src.includes("placeholder.svg");

      if ((!snapshotImage || currentIsPlaceholder) && fallbackImage) {
        imageElement.src = fallbackImage;
        imageElement.removeAttribute("srcset");
      }
    });
  } catch (error) {
    console.warn("Account invoice image fallback failed:", error);
  }
};

const activateOverlay = (overlay: HTMLElement) => {
  ensureStyle();
  document.body.classList.add(BODY_CLASS);

  hydrationRun += 1;
  const runId = hydrationRun;
  void hydrateMissingProductImages(overlay, pendingOrderNumber, runId);
};

const deactivateOverlay = () => {
  hydrationRun += 1;
  document.body.classList.remove(BODY_CLASS);
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  ensureStyle();

  window.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("#account-orders button");
      if (!(button instanceof HTMLButtonElement) || !button.textContent?.includes("عرض الفاتورة")) return;

      const row = button.closest("#account-orders [class*='justify-between']");
      pendingOrderNumber = row?.querySelector("p")?.textContent?.trim() || "";
    },
    true,
  );

  const existingOverlay = document.getElementById(OVERLAY_ID);
  if (existingOverlay) activateOverlay(existingOverlay);

  const observer = new MutationObserver(() => {
    const overlay = document.getElementById(OVERLAY_ID);

    if (overlay) {
      if (!document.body.classList.contains(BODY_CLASS)) activateOverlay(overlay);
      return;
    }

    if (document.body.classList.contains(BODY_CLASS)) deactivateOverlay();
  });

  observer.observe(document.body, { childList: true });
}
