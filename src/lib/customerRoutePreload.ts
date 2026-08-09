type PageLoader = () => Promise<unknown>;

export const loadHomePage = () => import("@/pages/HomePage");
export const loadProductsPage = () => import("@/pages/ProductsPage");
export const loadProductDetailPage = () => import("@/pages/ProductDetailPage");
export const loadCategoriesPage = () => import("@/pages/CategoriesPage");
export const loadFavoritesPage = () => import("@/pages/FavoritesPage");
export const loadCartPage = () => import("@/pages/CartPage");
export const loadAccountPage = () => import("@/pages/AccountPage");
export const loadCheckoutPage = () => import("@/pages/CheckoutPage");

const routeLoaders: Array<[test: (pathname: string) => boolean, loader: PageLoader]> = [
  [(path) => path === "/home", loadHomePage],
  [(path) => path === "/products", loadProductsPage],
  [(path) => path.startsWith("/product/"), loadProductDetailPage],
  [(path) => path === "/categories", loadCategoriesPage],
  [(path) => path === "/favorites", loadFavoritesPage],
  [(path) => path === "/cart", loadCartPage],
  [(path) => path === "/account", loadAccountPage],
  [(path) => path === "/checkout", loadCheckoutPage],
  [(path) => path === "/notifications", () => import("@/pages/NotificationsPage")],
  [(path) => path === "/seasonal-offers", () => import("@/pages/SeasonalOffersPage")],
  [(path) => path === "/new-arrivals", () => import("@/pages/NewArrivalsPage")],
  [(path) => path === "/best-sellers", () => import("@/pages/BestSellersPage")],
  [(path) => path === "/store-info", () => import("@/pages/StoreInfoPage")],
  [(path) => path === "/auth", () => import("@/pages/CustomerAuthPage")],
];

const canPreload = () => {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return !connection?.saveData && !connection?.effectiveType?.includes("2g");
};

export const preloadCustomerRoute = (target: string): void => {
  if (!canPreload()) return;

  let pathname = target;
  try {
    pathname = new URL(target, window.location.origin).pathname;
  } catch {
    // target is already a pathname.
  }

  const match = routeLoaders.find(([test]) => test(pathname));
  if (match) void match[1]().catch(() => undefined);
};

/** أهم المسارات تُحضّر بهدوء بعد اكتمال العرض الأول. */
export const preloadCoreCustomerRoutes = (): void => {
  if (!canPreload()) return;
  [loadProductsPage, loadCategoriesPage, loadProductDetailPage].forEach((loader) => {
    void loader().catch(() => undefined);
  });
};
