import "./lib/cryptoCompat";
import "./lib/customerAuthCompat";
import "./lib/accountInvoiceEnhancements";
import "./lib/accountInvoiceRenderer";
import "./lib/accountProfileRuntimeFix";
import "./lib/accountAvatarActions";
import "./lib/accountNoJitter";
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
import CustomerCartSync from "./components/CustomerCartSync";
import { startRuntimeMonitoring } from "./lib/runtimeMonitoring";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import "./index.css";
import "./mobile-smooth.css";
import "./desktop-storefront.css";
import "./desktop-pages.css";

const warmUpSupabaseConnection = () => {
  const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
  if (!rawUrl || typeof document === "undefined") return;

  try {
    const origin = new URL(rawUrl).origin;
    const existing = document.head.querySelector(`link[data-flamingo-preconnect="${origin}"]`);
    if (existing) return;

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = origin;
    preconnect.crossOrigin = "anonymous";
    preconnect.dataset.flamingoPreconnect = origin;
    document.head.appendChild(preconnect);

    const dnsPrefetch = document.createElement("link");
    dnsPrefetch.rel = "dns-prefetch";
    dnsPrefetch.href = origin;
    document.head.appendChild(dnsPrefetch);
  } catch {
    // Keep startup resilient if the environment value is unavailable or malformed.
  }
};

warmUpSupabaseConnection();
startRuntimeMonitoring();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<AppErrorBoundary><><ProductRatingSync /><CustomerCartSync /><App /></></AppErrorBoundary>);
