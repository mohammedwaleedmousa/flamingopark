import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  build: {
    target: "es2018",

    // تحسين تحميل CSS
    cssCodeSplit: true,

    // عدم إنشاء ملفات sourcemap في الإنتاج لتقليل الحجم
    sourcemap: false,

    rollupOptions: {
      output: {
        manualChunks: {
          react: [
            "react",
            "react-dom",
            "react-router-dom",
          ],

          charts: [
            "recharts",
          ],

          pdf: [
            "jspdf",
            "html2canvas",
          ],
        },
      },
    },

    // إظهار التحذير فقط للملفات الأكبر من 700KB
    chunkSizeWarningLimit: 700,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));