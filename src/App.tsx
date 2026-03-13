import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import FavoritesPage from "./pages/FavoritesPage";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import CustomerAuthPage from "./pages/CustomerAuthPage";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AboutPage from "./pages/AboutPage";
import OffersPage from "./pages/OffersPage";
import ReviewsPage from "./pages/ReviewsPage";
import NotFound from "./pages/NotFound";
import QRCodePage from "./pages/QRCodePage";

// Admin pages
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminProductFormPage from "./pages/admin/AdminProductFormPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminBannersPage from "./pages/admin/AdminBannersPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminBrandsPage from "./pages/admin/AdminBrandsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminDeliveryPage from "./pages/admin/AdminDeliveryPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";
import AdminSectionsPage from "./pages/admin/AdminSectionsPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminInvoicesPage from "./pages/admin/AdminInvoicesPage";
import AdminCODRegionsPage from "./pages/admin/AdminCODRegionsPage";
import AdminRevenuePage from "./pages/admin/AdminRevenuePage";
import AdminProfitReportPage from "./pages/admin/AdminProfitReportPage";
import AdminOffersPage from "./pages/admin/AdminOffersPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminBeneficiariesPage from "./pages/admin/AdminBeneficiariesPage";
import BeneficiaryAuthPage from "./pages/BeneficiaryAuthPage";
import BeneficiaryDashboard from "./pages/BeneficiaryDashboard";
import MohammedInvoicesPage from "./pages/MohammedInvoicesPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { customer } = useStore();
  if (!customer) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

// Redirect logged in customers to home
// Also handles referral code from URL
const AuthRedirect = () => {
  const { customer } = useStore();
  const location = window.location;
  
  // Check if there's a referral code in the URL
  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get('ref');
  
  if (customer && !refCode) {
    return <Navigate to="/home" replace />;
  }
  return <CustomerAuthPage />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/index" element={<AuthRedirect />} />
          <Route path="/index.html" element={<AuthRedirect />} />
          <Route path="/auth" element={<AuthRedirect />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
