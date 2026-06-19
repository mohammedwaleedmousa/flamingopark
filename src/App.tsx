import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import SplashScreen from "@/components/SplashScreen";
import LoadingScreen from "@/components/LoadingScreen";

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
const AdminBeneficiariesPage = lazy(() => import("./pages/admin/AdminBeneficiariesPage"));
const BeneficiaryAuthPage = lazy(() => import("./pages/BeneficiaryAuthPage"));
const BeneficiaryDashboard = lazy(() => import("./pages/BeneficiaryDashboard"));
const MohammedInvoicesPage = lazy(() => import("./pages/MohammedInvoicesPage"));

const queryClient = new QueryClient();

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
            <Route path="/product/:slug" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
            <Route path="/offers" element={<ProtectedRoute><OffersPage /></ProtectedRoute>} />
            <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/qr-code" element={<QRCodePage />} />
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
              <Route path="beneficiaries" element={<AdminBeneficiariesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            <Route path="/mohammed" element={<MohammedInvoicesPage />} />
            <Route path="/bene" element={<BeneficiaryAuthPage />} />
            <Route path="/bene/:code" element={<BeneficiaryDashboard />} />
            <Route path="/beneficiary" element={<BeneficiaryAuthPage />} />
            <Route path="/beneficiary/:code" element={<BeneficiaryDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
