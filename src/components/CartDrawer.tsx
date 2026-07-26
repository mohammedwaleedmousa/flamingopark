import { lazy, Suspense } from "react";

const CartDrawerContent = lazy(() => import("./CartDrawerContent"));

const CartDrawer = () => (
  <Suspense fallback={null}>
    <CartDrawerContent />
  </Suspense>
);

export default CartDrawer;
