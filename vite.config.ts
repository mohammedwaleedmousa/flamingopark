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
      const domainPattern = /const siteUrl = ["']https:\/\/flamingopark\.store["'];/;
      const currencyPattern = /priceCurrency:\s*["']YER["'],/;

      if (!domainPattern.test(code) || !currencyPattern.test(code)) {
        throw new Error("Product SEO guard no longer matches ProductDetailPage.tsx");
      }

      return code
        .replace(domainPattern, 'const siteUrl = "https://flamingoparkaden.com";')
        .replace(currencyPattern, 'priceCurrency: "SAR",');
    }

    if (file.endsWith("/src/pages/admin/AdminPaymentMethodsPage.tsx")) {
      const cardOptionPattern = /^\s*<SelectItem value="card">بطاقة<\/SelectItem>\s*$/gm;
      const walletOptionPattern = /^\s*<SelectItem value="wallet">محفظة إلكترونية<\/SelectItem>\s*$/gm;
      const validationAnchor = '      if (!nameAr) throw new Error("الاسم العربي مطلوب.");';
      const validation = `\n      if (!["cash", "bank"].includes(methodForm.type)) throw new Error("نوع الدفع غير مدعوم في صفحة الدفع الحالية.");\n      if (methodForm.type === "bank" && code !== "bank") throw new Error("كود التحويل البنكي يجب أن يكون bank حتى يتوافق مع صفحة الدفع.");\n      if (methodForm.type === "cash" && !["cash", "cod"].includes(code)) throw new Error("كود الدفع النقدي يجب أن يكون cash أو cod حتى يتوافق مع صفحة الدفع.");`;

      const cardMatches = code.match(cardOptionPattern) || [];
      const walletMatches = code.match(walletOptionPattern) || [];

      if (cardMatches.length !== 2) throw new Error(`Payment card option guard expected 2 matches, got ${cardMatches.length}`);
      if (walletMatches.length !== 2) throw new Error(`Payment wallet option guard expected 2 matches, got ${walletMatches.length}`);
      if (!code.includes(validationAnchor)) throw new Error("Payment validation guard no longer matches AdminPaymentMethodsPage.tsx");

      return code
        .replace(cardOptionPattern, "")
        .replace(walletOptionPattern, "")
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
    },
  },
}));