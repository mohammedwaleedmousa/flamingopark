import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./desktop-storefront.css";
import "./desktop-pages.css";

createRoot(document.getElementById("root")!).render(<App />);
