import { useEffect, lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useCustomerExperience } from "@/hooks/useCustomerExperience";
import LoadingScreen from "@/components/LoadingScreen";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { DateRangeProvider } from "@/lib/analytics/dateRange";
import { hydrateCurrencies } from "@/lib/currency";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { MotionConfig } from "framer-motion";
import CustomerAssistantEntry from "@/components/CustomerAssistantEntry";
import { ThemeProvider } from "next-themes";

// Temporary launch switch: keep the assistant implementation ready without showing its entry button.
const SHOW_CUSTOMER_ASSISTANT = false;

const CustomerAuthPage = lazy(() => import("./pages/CustomerAuthPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const BrandProductsPage = lazy(() => import("./pages/BrandProductsPage"));
const AllBrandsPage = lazy(() => import("./pages/AllBrandsPage"));
const BrandSectionPage = lazy(() => import("./pages/BrandSectionPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QRCodePage = lazy(() => import("./pages/QRCodePage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const BestSellersPage = lazy(() => import("./pages/BestSellersPage"));
const NewArrivalsPage = lazy(() => import("./pages/NewArrivalsPage"));
const NewSeasonPage = lazy(() => import("./pages/NewSeasonPage"));
const TopSellingPage = lazy(() => import("./pages/TopSellingPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const SeasonalOffersPage = lazy(() => import("./pages/SeasonalOffersPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage"));
const MyShipmentsPage = lazy(() => import("./pages/MyShipmentsPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const StoreInfoPage = lazy(() => import("./pages/StoreInfoPage"));
const BannerPage = lazy(() => import("./pages/bannerPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));

// Admin pages
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminProductFormPage = lazy(() => import("./pages/admin/AdminProductFormPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/AdminCustomersPage"));
const AdminBannersPage = lazy(() => import("./pages/admin/AdminBannersPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminBrandsPage = lazy(() => import("./pages/admin/AdminBrandsPage"));
const AdminBrandCategoryMapPage = lazy(() => import("./pages/admin/AdminBrandCategoryMapPage"));
const AdminCatalogWorkflowPage = lazy(() => import("./pages/admin/AdminCatalogWorkflowPage"));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage"));
const AdminDeliveryPage = lazy(() => import("./pages/admin/AdminDeliveryPage"));
const AdminReviewsPage = lazy(() => import("./pages/admin/AdminReviewsPage"));
const AdminSectionsPage = lazy(() => import("./pages/admin/AdminSectionsPage"));
const AdminContentPage = lazy(() => import("./pages/admin/AdminContentPage"));
const AdminInvoicesPage = lazy(() => import("./pages/admin/AdminInvoicesPage"));
const AdminCODRegionsPage = lazy(() => import("./pages/admin/AdminCODRegionsPage"));
const AdminOffersPage = lazy(() => import("./pages/admin/AdminOffersPage"));
const AdminCouponsPage = lazy(() => import("./pages/admin/AdminCouponsPage"));
const AdminAuditLogPage = lazy(() => import("./pages/admin/AdminAuditLogPage"));
const AdminLedgerPage = lazy(() => import("./pages/admin/AdminLedgerPage"));
const AdminRefundsPage = lazy(() => import("./pages/admin/AdminRefundsPage"));
const AdminExpensesPage = lazy(() => import("./pages/admin/AdminExpensesPage"));
const AdminPaymentMethodsPage = lazy(() => import("./pages/admin/AdminPaymentMethodsPage"));
const AdminInventoryAdjustmentsPage = lazy(() => import("./pages/admin/AdminInventoryAdjustmentsPage"));
const ReportsOverviewPage = lazy(() => import("./pages/admin/reports/ReportsOverviewPage"));
const ReportsFinancePage = lazy(() => import("./pages/admin/reports/ReportsFinancePage"));
const ReportsCustomersPage = lazy(() => import("./pages/admin/reports/ReportsCustomersPage"));
const AdminBrandPagesPage = lazy(() => import("./pages/admin/AdminBrandPagesPage"));
const AdminBrandSectionsPage = lazy(() => import("./pages/admin/AdminBrandSectionsPage"));
const AdminBrandSectionProductsPage = lazy(() => import("./pages/admin/AdminBrandSectionProductsPage"));
const AdminBrandPageEditor = lazy(() => import("./pages/admin/AdminBrandPageEditor"));
const AdminBrandFiltersPage = lazy(() => import("./pages/admin/AdminBrandFiltersPage"));
const AdminCustomerNotificationsPage = lazy(() => import("./pages/admin/AdminCustomerNotificationsPage"));
const AdminCustomerDetailPage = lazy(() => import("./pages/admin/AdminCustomerDetailPage"));
const AdminNotificationDeliveriesPage = lazy(() => import("./pages/admin/AdminNotificationDeliveriesPage"));
const AdminCurrenciesPage = lazy(() => import("./pages/admin/AdminCurrenciesPage"));
const AdminCountriesPage = lazy(() => import("./pages/admin/AdminCountriesPage"));
const AdminCampaignsPage = lazy(() => import("./pages/admin/AdminCampaignsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Default pages stay light; sensitive pages override this.
      gcTime: 30 * 60 * 1000, // 30 minutes - keep unused data in cache for 30 minutes
      retry: 1, // محاولة واحدة فقط حتى لا تتجمد الصفحة دقيقة كاملة عند فشل الطلب
      retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 2000), // انتظار قصير جداً
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true, // refetch when connection is restored
    },
  },
});

const RouteFallback = () => <LoadingScreen />;

const customerPageForPath = (pathname: string) => {
  if (pathname.startsWith("/product/")) return "products";
  if (pathname.startsWith("/brand")) return "brands";
  if (pathname === "/order-confirmation") return "checkout";
  if (pathname === "/order-tracking") return "my-orders";
  if (pathname === "/seasonal-offers") return "offers";
  return pathname.slice(1);
};

const CustomerPageUnavailable = () => (
  <main className="grid min-h-screen place-items-center bg-background px-6 text-center" dir="rtl">
    <div className="max-w-md space-y-4">
      <h1 className="font-heading text-3xl text-foreground">هذه الصفحة غير متاحة حالياً</h1>
      <p className="text-muted-foreground">تم إخفاء هذه الواجهة مؤقتاً من إدارة المتجر.</p>
      <a href="/home" className="inline-flex bg-primary px-5 py-3 text-primary-foreground">العودة للرئيسية</a>
    </div>
  </main>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { data: customerExperience } = useCustomerExperience();
  const pageId = customerPageForPath(pathname);

  if (customerExperience?.pages[pageId] === false) return <CustomerPageUnavailable />;
  return <>{children}</>;
};

const AuthRedirect = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const refCode = searchParams.get("ref");

  if (!refCode) return <Navigate to="/home" replace />;

  return <CustomerAuthPage />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // On POP (back/forward) let the browser restore the previous scroll position.
    if (navType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, navType]);

  return null;
};

const App = () => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // هنا يتم تجهيز العملات عند تشغيل الموقع
  useEffect(() => {
    hydrateCurrencies();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <MotionConfig reducedMotion={isMobile ? "always" : "user"}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DateRangeProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AnalyticsTracker />
          <SpeedInsights />
          {SHOW_CUSTOMER_ASSISTANT && <CustomerAssistantEntry />}
          <Suspense fallback={<RouteFallback />}>
            <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/index" element={<AuthRedirect />} />
            <Route path="/index.html" element={<AuthRedirect />} />
            <Route path="/auth" element={<CustomerAuthPage />} />
            <Route path="/signin" element={<CustomerAuthPage />} />
            <Route path="/signup" element={<CustomerAuthPage />} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/seasonal-offers" element={<ProtectedRoute><SeasonalOffersPage /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
            <Route path="/best-sellers" element={<ProtectedRoute><BestSellersPage /></ProtectedRoute>} />
            <Route path="/new-arrivals" element={<ProtectedRoute><NewArrivalsPage /></ProtectedRoute>} />
            <Route path="/new-season" element={<ProtectedRoute><NewSeasonPage /></ProtectedRoute>} />
            <Route path="/top-selling" element={<ProtectedRoute><TopSellingPage /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
            <Route path="/my-shipments" element={<ProtectedRoute><MyShipmentsPage /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/product/:slug" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
            <Route path="/brand/:slug" element={ <ProtectedRoute><BrandPage /></ProtectedRoute> } />
            <Route path="/brands" element={ <ProtectedRoute><AllBrandsPage /></ProtectedRoute> } />
            <Route path="/brands/:slug" element={ <ProtectedRoute><BrandPage /></ProtectedRoute> } />
            <Route path="/brands/:slug/products" element={<ProtectedRoute><BrandProductsPage /></ProtectedRoute>} />
            <Route path="/brands/:slug/sections/:sectionSlug" element={ <ProtectedRoute><BrandSectionPage /></ProtectedRoute> } />
            <Route path="/brand/:slug/sections/:sectionSlug" element={ <ProtectedRoute><BrandSectionPage /></ProtectedRoute> } />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
            <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/qr-code" element={<QRCodePage />} />
            <Route path="/store-info" element={<ProtectedRoute><StoreInfoPage /></ProtectedRoute>} />
            <Route path="/banner/:slug" element={<ProtectedRoute><BannerPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/order-tracking" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
            <Route path="/brands/:slug/sections/:sectionSlug" element={ <ProtectedRoute><BrandSectionPage /></ProtectedRoute> } />
            <Route path="/brand/:slug/sections/:sectionSlug" element={ <ProtectedRoute><BrandSectionPage /></ProtectedRoute> } />
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/new" element={<AdminProductFormPage />} />
              <Route path="products/:id" element={<AdminProductFormPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="banners" element={<AdminBannersPage />} />
              <Route path="campaigns" element={<AdminCampaignsPage />} />
              <Route path="brands" element={<AdminBrandsPage />} />
              <Route path="brand-category-map" element={<AdminBrandCategoryMapPage />} />
              <Route path="catalog-workflow" element={<AdminCatalogWorkflowPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="delivery" element={<AdminDeliveryPage />} />
              <Route path="cod-regions" element={<AdminCODRegionsPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="sections" element={<AdminSectionsPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="reports" element={<ReportsOverviewPage />} />
              <Route path="reports/finance" element={<ReportsFinancePage />} />
              <Route path="reports/customers" element={<ReportsCustomersPage />} />
              {/* Legacy aliases */}
              <Route path="analytics" element={<Navigate to="/admin/reports" replace />} />
              <Route path="revenue" element={<Navigate to="/admin/reports" replace />} />
              <Route path="profit-report" element={<Navigate to="/admin/reports/finance" replace />} />
              <Route path="finance" element={<Navigate to="/admin/reports/finance" replace />} />
              <Route path="customer-intelligence" element={<Navigate to="/admin/reports/customers" replace />} />
              <Route path="offers" element={<AdminOffersPage />} />
              <Route path="coupons" element={<AdminCouponsPage />} />
              <Route path="audit-log" element={<AdminAuditLogPage />} />
              <Route path="ledger" element={<AdminLedgerPage />} />
              <Route path="refunds" element={<AdminRefundsPage />} />
              <Route path="expenses" element={<AdminExpensesPage />} />
              <Route path="payment-methods" element={<AdminPaymentMethodsPage />} />
              <Route path="inventory-adjustments" element={<AdminInventoryAdjustmentsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="brand-pages" element={<AdminBrandPagesPage />} />
              <Route path="brand-pages/new" element={<AdminBrandPageEditor />} />
              <Route path="brand-pages/:id" element={<AdminBrandPageEditor />} />
              <Route path="brand-section-products/:id" element={<AdminBrandSectionProductsPage />} />
              <Route path="brand-filters/:id" element={<AdminBrandFiltersPage />} />
              <Route path="brand-sections" element={<AdminBrandSectionsPage />} />
              <Route path="brand-filters" element={<AdminBrandFiltersPage />} />
              <Route path="customer-notifications" element={<AdminCustomerNotificationsPage />} />
              <Route path="notification-deliveries" element={<AdminNotificationDeliveriesPage />} />
              <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
              <Route path="currencies" element={<AdminCurrenciesPage />} />
              <Route path="countries" element={<AdminCountriesPage />} />
              <Route path="brand-sections/:id/products" element={<AdminBrandSectionProductsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DateRangeProvider>
    </TooltipProvider>
    </MotionConfig>
    </ThemeProvider>
  </QueryClientProvider>
);
};

export default App;
