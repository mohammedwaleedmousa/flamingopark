/** Maps admin routes to the backend table used for Excel import/export. */
export interface ExcelTableConfig {
  table: string;
  label: string;
  /** columns hidden from the exported sheet (heavy/internal payloads) */
  omit?: string[];
}

export const EXCEL_TABLES: Record<string, ExcelTableConfig> = {
  products: { table: "products", label: "المنتجات" },
  orders: { table: "orders", label: "الطلبات" },
  customers: { table: "customers", label: "العملاء" },
  banners: { table: "banners", label: "البانرات" },
  campaigns: { table: "campaigns", label: "الحملات" },
  brands: { table: "brands", label: "الماركات" },
  categories: { table: "categories", label: "الأقسام" },
  sections: { table: "sections", label: "الأقسام الرئيسية" },
  offers: { table: "offers", label: "العروض" },
  coupons: { table: "coupons", label: "الكوبونات" },
  reviews: { table: "reviews", label: "التقييمات" },
  expenses: { table: "expenses", label: "المصروفات" },
  refunds: { table: "refunds", label: "المستردات" },
  "payment-methods": { table: "payment_methods", label: "طرق الدفع" },
  "cod-regions": { table: "cod_regions", label: "مناطق الدفع عند الاستلام" },
  delivery: { table: "delivery_options", label: "خيارات التوصيل" },
  currencies: { table: "currencies", label: "العملات" },
  countries: { table: "countries", label: "الدول" },
  content: { table: "site_content", label: "محتوى الموقع" },
  invoices: { table: "orders", label: "الفواتير" },
  "audit-log": { table: "audit_logs", label: "سجل التدقيق" },
  ledger: { table: "orders", label: "دفتر الحسابات" },
  "inventory-adjustments": { table: "inventory_adjustments", label: "تسويات المخزون" },
  "brand-pages": { table: "brand_pages", label: "صفحات الماركات" },
  "brand-sections": { table: "brand_sections", label: "أقسام الماركات" },
  "brand-filters": { table: "brand_filters", label: "فلاتر الماركات" },
  "brand-category-map": { table: "brand_categories", label: "ربط الماركات بالأقسام" },
  "customer-notifications": { table: "customer_notifications", label: "إشعارات العملاء" },
  "notification-deliveries": { table: "notification_deliveries", label: "تسليم الإشعارات" },
};

/** Resolve the Excel config for a pathname like /admin/products/new */
export function resolveExcelTable(pathname: string): ExcelTableConfig | null {
  const parts = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return null;
  return EXCEL_TABLES[parts[0]] ?? null;
}
