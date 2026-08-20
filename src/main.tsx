import "./lib/cryptoCompat";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ProductRatingSync from "./components/ProductRatingSync";
import "./index.css";
import "./desktop-storefront.css";
import "./desktop-pages.css";

createRoot(document.getElementById("root")!).render(<AppErrorBoundary><><ProductRatingSync /><App /></></AppErrorBoundary>);
