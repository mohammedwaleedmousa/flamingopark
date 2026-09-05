import "./lib/cryptoCompat";
import "./lib/customerAuthCompat";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ProductRatingSync from "./components/ProductRatingSync";
import CustomerCartSync from "./components/CustomerCartSync";
import { startRuntimeMonitoring } from "./lib/runtimeMonitoring";
import "./index.css";
import "./mobile-smooth.css";
import "./desktop-storefront.css";
import "./desktop-pages.css";

startRuntimeMonitoring();

createRoot(document.getElementById("root")!).render(<AppErrorBoundary><><ProductRatingSync /><CustomerCartSync /><App /></></AppErrorBoundary>);
