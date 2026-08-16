export const CUSTOMER_EXPERIENCE_SETTING_KEY = "customer_experience";

export const customerPageOptions = [
  { id: "home", label: "الرئيسية", path: "/home" },
  { id: "products", label: "المنتجات", path: "/products" },
  { id: "categories", label: "الأقسام", path: "/categories" },
  { id: "brands", label: "الماركات", path: "/brands" },
  { id: "offers", label: "العروض", path: "/seasonal-offers" },
  { id: "best-sellers", label: "الأكثر مبيعاً", path: "/best-sellers" },
  { id: "new-arrivals", label: "وصل حديثاً", path: "/new-arrivals" },
  { id: "new-season", label: "جديد الموسم", path: "/new-season" },
  { id: "top-selling", label: "الأكثر طلباً", path: "/top-selling" },
  { id: "curated", label: "مختاراتنا", path: "/products" },
  { id: "search", label: "البحث", path: "/search" },
  { id: "favorites", label: "المفضلة", path: "/favorites" },
  { id: "cart", label: "السلة", path: "/cart" },
  { id: "checkout", label: "إتمام الطلب", path: "/checkout" },
  { id: "account", label: "حسابي", path: "/account" },
  { id: "my-orders", label: "طلباتي والتتبع", path: "/my-orders" },
  { id: "my-shipments", label: "شحناتي", path: "/my-shipments" },
  { id: "notifications", label: "الإشعارات", path: "/notifications" },
  { id: "reviews", label: "التقييمات", path: "/reviews" },
  { id: "store-info", label: "عن المتجر", path: "/store-info" },
  { id: "qr-code", label: "رمز المتجر", path: "/qr-code" },
] as const;

export const homeSectionOptions = [
  { id: "hero", label: "البانر الرئيسي" },
  { id: "brands", label: "شريط الماركات" },
  { id: "categories", label: "الأقسام" },
  { id: "editorial", label: "رسالة العلامة" },
  { id: "featuredProducts", label: "المنتجات المختارة" },
  { id: "collections", label: "المجموعات" },
  { id: "newArrivals", label: "وصل حديثاً" },
  { id: "bestSellers", label: "الأكثر مبيعاً" },
  { id: "services", label: "مزايا المتجر" },
] as const;

type ToggleMap = Record<string, boolean>;

export interface CustomerExperienceSettings {
  pages: ToggleMap;
  homeSections: ToggleMap;
}

export const defaultCustomerExperienceSettings: CustomerExperienceSettings = {
  pages: Object.fromEntries(customerPageOptions.map((page) => [page.id, true])),
  homeSections: Object.fromEntries(homeSectionOptions.map((section) => [section.id, true])),
};

export const parseCustomerExperienceSettings = (value: unknown): CustomerExperienceSettings => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultCustomerExperienceSettings;
  }

  const settings = value as Partial<CustomerExperienceSettings>;
  return {
    pages: { ...defaultCustomerExperienceSettings.pages, ...(settings.pages || {}) },
    homeSections: { ...defaultCustomerExperienceSettings.homeSections, ...(settings.homeSections || {}) },
  };
};
