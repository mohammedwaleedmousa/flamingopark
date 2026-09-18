export type OrderDiscountType = "fixed" | "percentage";

/** All amounts must use the same currency. Delivery is always added after discount. */
export function calculateOrderTotals(
  subtotal: number,
  deliveryFee: number,
  discountValue = 0,
  discountType: OrderDiscountType = "fixed",
) {
  const productSubtotal = Math.max(0, subtotal);
  const shipping = Math.max(0, deliveryFee);
  const requestedDiscount = discountType === "percentage"
    ? productSubtotal * Math.max(0, discountValue) / 100
    : Math.max(0, discountValue);
  const discountAmount = Math.min(productSubtotal, requestedDiscount);

  return {
    subtotal: productSubtotal,
    deliveryFee: shipping,
    discountAmount,
    total: productSubtotal - discountAmount + shipping,
  };
}
