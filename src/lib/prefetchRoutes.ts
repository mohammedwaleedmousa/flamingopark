let productDetailPagePromise: Promise<unknown> | null = null;

export const prefetchProductDetailPage = () => {
  if (!productDetailPagePromise) {
    productDetailPagePromise = import("@/pages/ProductDetailPage").catch(() => {
      productDetailPagePromise = null;
      return undefined;
    });
  }

  return productDetailPagePromise;
};

// Mobile users do not get hover, so waiting for pointer-down means the heavy
// product-detail chunk only starts downloading after the customer taps.
// Warm it shortly after any product-card bundle is loaded instead, while keeping
// the initial hero/images first in the network queue.
if (typeof window !== "undefined") {
  const preload = () => { void prefetchProductDetailPage(); };
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(preload, { timeout: 1200 });
  } else {
    window.setTimeout(preload, 700);
  }
}
