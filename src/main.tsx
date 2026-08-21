import "./lib/cryptoCompat";
import "./lib/customerAuthCompat";
import "./lib/accountInvoiceEnhancements";
import "./lib/accountInvoiceRenderer";
import "./lib/myOrdersInvoiceBridge";
import "./lib/adminDashboardDomCompat";
import "./lib/adminDashboardDrilldowns";
import "./lib/adminDrilldownRestore";
import "./lib/adminProductsMobileEnhancements";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ProductRatingSync from "./components/ProductRatingSync";
import CheckoutCodGuard from "./components/CheckoutCodGuard";
import "./index.css";
import "./desktop-storefront.css";
import "./desktop-pages.css";

const warmProductDetailRoute = () => {
  void import("./pages/ProductDetailPage");
};

if (typeof window !== "undefined") {
  const requestIdle = (window as any).requestIdleCallback as ((callback: () => void, options?: { timeout: number }) => number) | undefined;

  if (requestIdle) {
    requestIdle(warmProductDetailRoute, { timeout: 1200 });
  } else {
    window.setTimeout(warmProductDetailRoute, 500);
  }
}

createRoot(document.getElementById("root")!).render(<AppErrorBoundary><><ProductRatingSync /><CheckoutCodGuard /><App /></></AppErrorBoundary>);