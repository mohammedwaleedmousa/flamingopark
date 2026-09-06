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
