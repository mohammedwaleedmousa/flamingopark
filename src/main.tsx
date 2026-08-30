import "./lib/cryptoCompat";
import "./lib/customerAuthCompat";
import "./lib/accountInvoiceEnhancements";
import "./lib/accountInvoiceRenderer";
import "./lib/myOrdersInvoiceBridge";
import "./lib/adminDashboardDomCompat";
import "./lib/adminDashboardDrilldowns";
import "./lib/adminDrilldownRestore";
import "./lib/adminProductsMobileEnhancements";
import "./lib/adminUiEnhancements";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ProductRatingSync from "./components/ProductRatingSync";
import CheckoutCodGuard from "./components/CheckoutCodGuard";
import { startRuntimeMonitoring } from "./lib/runtimeMonitoring";
import "./index.css";
import "./mobile-smooth.css";
import "./desktop-storefront.css";
import "./desktop-pages.css";

startRuntimeMonitoring();

createRoot(document.getElementById("root")!).render(<AppErrorBoundary><><ProductRatingSync /><CheckoutCodGuard /><App /></></AppErrorBoundary>);