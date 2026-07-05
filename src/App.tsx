import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import SplashScreen from "@/components/SplashScreen";
import LoadingScreen from "@/components/LoadingScreen";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const CustomerAuthPage = lazy(() => import("./pages/CustomerAuthPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const OffersPage = lazy(() => import("./pages/OffersPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QRCodePage = lazy(() => import("./pages/QRCodePage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const BestSellersPage = lazy(() => import("./pages/BestSellersPage"));
const NewArrivalsPage = lazy(() => import("./pages/NewArrivalsPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage"));
const SeasonalOffersPage = lazy(() => import("./pages/SeasonalOffersPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const StoreInfoPage = lazy(() => import("./pages/StoreInfoPage"));
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
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage"));
const AdminDeliveryPage = lazy(() => import("./pages/admin/AdminDeliveryPage"));
const AdminReviewsPage = lazy(() => import("./pages/admin/AdminReviewsPage"));
const AdminSectionsPage = lazy(() => import("./pages/admin/AdminSectionsPage"));
const AdminContentPage = lazy(() => import("./pages/admin/AdminContentPage"));
const AdminInvoicesPage = lazy(() => import("./pages/admin/AdminInvoicesPage"));
const AdminCODRegionsPage = lazy(() => import("./pages/admin/AdminCODRegionsPage"));
const AdminRevenuePage = lazy(() => import("./pages/admin/AdminRevenuePage"));
const AdminProfitReportPage = lazy(() => import("./pages/admin/AdminProfitReportPage"));
const AdminOffersPage = lazy(() => import("./pages/admin/AdminOffersPage"));
const AdminCouponsPage = lazy(() => import("./pages/admin/AdminCouponsPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminAuditLogPage = lazy(() => import("./pages/admin/AdminAuditLogPage"));
const AdminLedgerPage = lazy(() => import("./pages/admin/AdminLedgerPage"));
const AdminRefundsPage = lazy(() => import("./pages/admin/AdminRefundsPage"));
const AdminExpensesPage = lazy(() => import("./pages/admin/AdminExpensesPage"));
const AdminPaymentMethodsPage = lazy(() => import("./pages/admin/AdminPaymentMethodsPage"));
const AdminInventoryAdjustmentsPage = lazy(() => import("./pages/admin/AdminInventoryAdjustmentsPage"));
const AdminFinanceDashboard = lazy(() => import("./pages/admin/AdminFinanceDashboard"));
const AdminCustomerIntelligence = lazy(() => import("./pages/admin/AdminCustomerIntelligence"));
const AdminAnalyticsDashboard = lazy(() => import("./pages/admin/AdminAnalyticsDashboard"));
const MohammedInvoicesPage = lazy(() => import("./pages/MohammedInvoicesPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes - keep unused data in cache for 30 minutes
      retry: 2, // retry failed requests 2 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // exponential backoff
      refetchOnWindowFocus: false, // don't refetch when user returns to window
      refetchOnMount: false, // don't refetch when component mounts if data is fresh
      refetchOnReconnect: true, // refetch when connection is restored
    },
  },
});

const RouteFallback = () => <LoadingScreen />;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Unified single-platform: no country/customer gate for browsing.
  return <>{children}</>;
};

// Redirect logged in customers to home
// Also handles referral code from URL
const AuthRedirect = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const refCode = searchParams.get("ref");
  // Single unified platform: go straight to home (auth only required at checkout).
  if (!refCode) return <Navigate to="/home" replace />;
  return <CustomerAuthPage />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("flamingo-splash-seen");
  });

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {showSplash && (
        <SplashScreen onDone={() => { sessionStorage.setItem("flamingo-splash-seen", "1"); setShowSplash(false); }} />
      )}
      <BrowserRouter>
        <ScrollToTop />
        <AnalyticsTracker />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/index" element={<AuthRedirect />} />
            <Route path="/index.html" element={<AuthRedirect />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/signin" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/legacy-auth" element={<CustomerAuthPage />} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/comparison" element={<ProtectedRoute><ComparisonPage /></ProtectedRoute>} />
            <Route path="/seasonal-offers" element={<ProtectedRoute><SeasonalOffersPage /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
            <Route path="/best-sellers" element={<ProtectedRoute><BestSellersPage /></ProtectedRoute>} />
            <Route path="/new-arrivals" element={<ProtectedRoute><NewArrivalsPage /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/product/:slug" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
            <Route path="/offers" element={<ProtectedRoute><OffersPage /></ProtectedRoute>} />
            <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/qr-code" element={<QRCodePage />} />
            <Route path="/store-info" element={<ProtectedRoute><StoreInfoPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/order-tracking" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
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
              <Route path="brands" element={<AdminBrandsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="delivery" element={<AdminDeliveryPage />} />
              <Route path="cod-regions" element={<AdminCODRegionsPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="sections" element={<AdminSectionsPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="revenue" element={<AdminRevenuePage />} />
              <Route path="profit-report" element={<AdminProfitReportPage />} />
              <Route path="offers" element={<AdminOffersPage />} />
              <Route path="coupons" element={<AdminCouponsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="audit-log" element={<AdminAuditLogPage />} />
              <Route path="ledger" element={<AdminLedgerPage />} />
              <Route path="refunds" element={<AdminRefundsPage />} />
              <Route path="expenses" element={<AdminExpensesPage />} />
              <Route path="payment-methods" element={<AdminPaymentMethodsPage />} />
              <Route path="inventory-adjustments" element={<AdminInventoryAdjustmentsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="finance" element={<AdminFinanceDashboard />} />
              <Route path="customer-intelligence" element={<AdminCustomerIntelligence/>} />
            </Route>

            <Route path="/mohammed" element={<MohammedInvoicesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
