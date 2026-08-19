import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const launchReadinessGuard = (): Plugin => ({
  name: "flamingo-launch-readiness-guard",
  enforce: "pre",
  transform(code, id) {
    const file = id.replace(/\\/g, "/");

    if (file.endsWith("/src/pages/ProductDetailPage.tsx")) {
      const oldDomain = 'const siteUrl = "https://flamingopark.store";';
      const oldCurrency = 'priceCurrency: "YER",';
      if (!code.includes(oldDomain) || !code.includes(oldCurrency)) throw new Error("Product SEO guard no longer matches ProductDetailPage.tsx");
      return code.replace(oldDomain, 'const siteUrl = "https://flamingoparkaden.com";').replace(oldCurrency, 'priceCurrency: "SAR",');
    }

    if (file.endsWith("/src/pages/admin/AdminPaymentMethodsPage.tsx")) {
      const cardOption = '                    <SelectItem value="card">بطاقة</SelectItem>\n';
      const walletOption = '                    <SelectItem value="wallet">محفظة إلكترونية</SelectItem>\n';
      const validationAnchor = '      if (!nameAr) throw new Error("الاسم العربي مطلوب.");\n';
      const validation = '      if (!["cash", "bank"].includes(methodForm.type)) throw new Error("نوع الدفع غير مدعوم في صفحة الدفع الحالية.");\n      if (methodForm.type === "bank" && code !== "bank") throw new Error("كود التحويل البنكي يجب أن يكون bank حتى يتوافق مع صفحة الدفع.");\n      if (methodForm.type === "cash" && !["cash", "cod"].includes(code)) throw new Error("كود الدفع النقدي يجب أن يكون cash أو cod حتى يتوافق مع صفحة الدفع.");\n';

      if ((code.match(new RegExp(cardOption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length !== 2) throw new Error("Payment card option guard no longer matches AdminPaymentMethodsPage.tsx");
      if ((code.match(new RegExp(walletOption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length !== 2) throw new Error("Payment wallet option guard no longer matches AdminPaymentMethodsPage.tsx");
      if (!code.includes(validationAnchor)) throw new Error("Payment validation guard no longer matches AdminPaymentMethodsPage.tsx");

      return code
        .replaceAll(cardOption, "")
        .replaceAll(walletOption, "")
        .replace(validationAnchor, validationAnchor + validation)
        .replace('placeholder="cod أو transfer"', 'placeholder="cash أو cod أو bank"');
    }

    return null;
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  build: {
    target: "es2018",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          pdf: ["jspdf", "html2canvas"],
          motion: ["framer-motion"],
          commerce: ["@tanstack/react-query", "@supabase/supabase-js", "zustand"],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },

  plugins: [
    launchReadinessGuard(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@vercel/speed-insights/react": path.resolve(__dirname, "./src/lib/noopSpeedInsights.tsx"),
    },
  },
}));