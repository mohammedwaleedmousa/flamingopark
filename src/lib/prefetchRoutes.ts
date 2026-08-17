let productDetailPagePromise: Promise<unknown> | null = null;

export const prefetchProductDetailPage = () => {
  if (!productDetailPagePromise) {
    productDetailPagePromise = import("@/pages/ProductDetailPage").catch((error) => {
      productDetailPagePromise = null;
      throw error;
    });
  }

  return productDetailPagePromise;
};
