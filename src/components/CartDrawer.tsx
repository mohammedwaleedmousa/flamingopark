import { lazy, Suspense, useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { preloadCartDrawer } from "@/lib/cartDrawerPreload";

const CartDrawerContent = lazy(preloadCartDrawer);

const CartDrawer = () => {
  const isCartOpen = useStore((state) => state.isCartOpen);
  const [hasOpened, setHasOpened] = useState(isCartOpen);

  useEffect(() => {
    if (isCartOpen) setHasOpened(true);
  }, [isCartOpen]);

  if (!hasOpened) return null;

  return (
    <Suspense fallback={null}>
      <CartDrawerContent />
    </Suspense>
  );
};

export default CartDrawer;
