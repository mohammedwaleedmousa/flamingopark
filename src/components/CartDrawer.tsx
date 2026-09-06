import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

import { useFavorites } from "@/hooks/useFavorites";
import { useStore } from "@/store/useStore";

const CartDrawerContent = lazy(() => import("./CartDrawerContent"));

const CountBadge = ({ count, className }: { count: number; className: string }) => {
  if (count <= 0) return null;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none fixed top-[4px] z-[60] flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-[#D4777D] px-[3px] text-[8px] font-bold leading-none text-white shadow-sm md:hidden ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

const CartDrawer = () => {
  const { pathname } = useLocation();
  const cartCount = useStore((state) => state.cart.reduce((sum, item) => sum + item.quantity, 0));
  const favoritesCount = useFavorites((state) => state.favorites.length);
  const isProductPage = pathname.startsWith("/product/");

  return (
    <>
      {isProductPage && (
        <>
          <CountBadge count={cartCount} className="left-[96px]" />
          <CountBadge count={favoritesCount} className="left-[60px]" />
        </>
      )}

      <Suspense fallback={null}>
        <CartDrawerContent />
      </Suspense>
    </>
  );
};

export default CartDrawer;
