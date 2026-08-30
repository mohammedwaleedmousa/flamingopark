import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { captureUTM, recordPurchaseAnalytics, track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_BASE_PATH, LEGACY_ADMIN_BASE_PATH } from "@/lib/adminRoutes";
import { useStore } from "@/store/useStore";

const SITE_URL = "https://flamingoparkaden.com";
const DEFAULT_TITLE = "Flamingo Park | فلامنجو بارك";
const DEFAULT_DESCRIPTION = "Flamingo Park - متجر إلكتروني فاخر للأزياء والإكسسوارات والماركات العالمية.";
const DEFAULT_IMAGE = `${SITE_URL}/icons/flamingo.jpeg`;
const PURCHASE_SESSION_PREFIX = "fl-purchase-tracked:";

const upsertMeta = (selector: string, attrs: Record<string, string>, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
};

const upsertJsonLd = (payload: Record<string, unknown> | null) => {
  const id = "flamingo-route-jsonld";
  document.getElementById(id)?.remove();
  if (!payload) return;

  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);
};

const applySeo = ({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd = null,
}: {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  type?: "website" | "product";
  jsonLd?: Record<string, unknown> | null;
}) => {
  document.title = title;
  upsertMeta('meta[name="description"]', { name: "description" }, description);
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, title);
  upsertMeta('meta[property="og:description"]', { property: "og:description" }, description);
  upsertMeta('meta[property="og:type"]', { property: "og:type" }, type);
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
  upsertMeta('meta[property="og:image"]', { property: "og:image" }, image);
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, image);
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
  upsertCanonical(canonical);
  upsertJsonLd(jsonLd);
};

const isAdminRoute = (pathname: string) =>
  pathname === ADMIN_BASE_PATH ||
  pathname.startsWith(`${ADMIN_BASE_PATH}/`) ||
  pathname === LEGACY_ADMIN_BASE_PATH ||
  pathname.startsWith(`${LEGACY_ADMIN_BASE_PATH}/`);

/**
 * Fires customer-facing page and commerce analytics while keeping route SEO metadata in sync.
 * Admin traffic is intentionally excluded from analytics and SEO mutations.
 */
const AnalyticsTracker = () => {
  const location = useLocation();
  const { pathname, search } = location;
  const cart = useStore((state) => state.cart);
  const getCartTotal = useStore((state) => state.getCartTotal);
  const lastPageView = useRef<string>("");
  const lastProductView = useRef<string>("");
  const lastCheckout = useRef<string>("");
  const lastPurchase = useRef<string>("");

  useEffect(() => {
    captureUTM();
  }, []);

  useEffect(() => {
    if (isAdminRoute(pathname)) return;
    const key = pathname + search;
    if (key === lastPageView.current) return;
    lastPageView.current = key;
    void track({ event_type: "page_view", path: pathname });
  }, [pathname, search]);

  useEffect(() => {
    if (isAdminRoute(pathname)) return;
    if (pathname !== "/checkout" || cart.length === 0) {
      lastCheckout.current = "";
      return;
    }

    const cartSignature = cart
      .map((item) => [item.product.id, item.variantId || "", item.selectedSize || "", item.selectedColor || item.variantColor || "", item.quantity].join(":"))
      .sort()
      .join("|");
    const key = `checkout:${cartSignature}`;
    if (lastCheckout.current === key) return;
    lastCheckout.current = key;

    void track({
      event_type: "begin_checkout",
      value: getCartTotal(),
      metadata: {
        items_count: cart.reduce((sum, item) => sum + item.quantity, 0),
        unique_products: new Set(cart.map((item) => item.product.id)).size,
        items: cart.map((item) => ({
          product_id: item.product.id,
          name: item.product.nameAr || item.product.name,
          quantity: item.quantity,
          variant_id: item.variantId || null,
          selected_size: item.selectedSize || null,
          selected_color: item.selectedColor || item.variantColor || null,
        })),
      },
    });
  }, [pathname, cart, getCartTotal]);

  useEffect(() => {
    if (pathname !== "/order-confirmation") return;

    const orderData = (location.state as { orderData?: Record<string, any> } | null)?.orderData;
    const orderId = String(orderData?.orderId || "").trim();
    const trackingToken = String(orderData?.trackingToken || "").trim();
    if (!orderId || !trackingToken || lastPurchase.current === orderId) return;

    const sessionKey = `${PURCHASE_SESSION_PREFIX}${orderId}`;
    try {
      if (sessionStorage.getItem(sessionKey) === "1") {
        lastPurchase.current = orderId;
        return;
      }
    } catch {
      // Session storage is optional; the ref still prevents render duplicates.
    }

    lastPurchase.current = orderId;
    const total = Number(orderData?.total);
    const items = Array.isArray(orderData?.items) ? orderData.items : [];

    void (async () => {
      const persisted = await recordPurchaseAnalytics(orderId, trackingToken);
      if (!persisted) {
        lastPurchase.current = "";
        return;
      }

      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // Ignore storage failures; analytics must never break checkout confirmation.
      }
    })();

    try {
      const gtag = (window as any).gtag;
      if (typeof gtag === "function") {
        gtag("event", "purchase", {
          page_path: pathname,
          transaction_id: orderId,
          value: Number.isFinite(total) ? total : undefined,
          currency: orderData?.currencyMode || undefined,
          payment_method: orderData?.paymentMethod || undefined,
          items_count: items.reduce((sum: number, item: any) => sum + Math.max(0, Number(item?.quantity) || 0), 0),
          unique_products: new Set(items.map((item: any) => item?.product_id).filter(Boolean)).size,
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[analytics] purchase gtag forward failed", err);
    }

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from("customer_carts")
        .update({
          status: "converted",
          converted_order_id: orderId,
          abandoned_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .in("status", ["active", "abandoned", "cleared"]);

      if (error && import.meta.env.DEV) console.warn("[analytics] cart conversion sync failed", error);
    })();
  }, [pathname, location.state]);

  useEffect(() => {
    if (isAdminRoute(pathname)) return;
    if (!pathname.startsWith("/product/")) lastProductView.current = "";

    let cancelled = false;
    const canonical = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;

    const applyRouteSeo = async () => {
      if (pathname.startsWith("/product/")) {
        const slug = decodeURIComponent(pathname.slice("/product/".length));
        const { data } = await (supabase as any)
          .from("products")
          .select("id,name,name_ar,slug,price,description,description_ar,images,brand,in_stock")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (cancelled) return;
        if (data) {
          const name = String(data.name_ar || data.name || "منتج").trim();
          const brand = String(data.brand || "").trim();
          const title = `${name}${brand ? ` | ${brand}` : ""} | Flamingo Park`;
          const description = String(data.description_ar || data.description || `تسوق ${name} من Flamingo Park.`).trim().slice(0, 180);
          const image = Array.isArray(data.images) && data.images[0] ? String(data.images[0]) : DEFAULT_IMAGE;
          const price = Number(data.price);
          const productViewKey = `product:${data.id}`;

          if (lastProductView.current !== productViewKey) {
            lastProductView.current = productViewKey;
            void track({
              event_type: "product_view",
              product_id: data.id,
              value: Number.isFinite(price) ? price : null,
              metadata: {
                name,
                brand: brand || null,
                slug: data.slug,
                in_stock: Boolean(data.in_stock),
              },
            });
          }

          applySeo({
            title,
            description,
            canonical,
            image,
            type: "product",
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "Product",
              name,
              image: Array.isArray(data.images) ? data.images : [image],
              description,
              ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
              offers: {
                "@type": "Offer",
                url: canonical,
                priceCurrency: "SAR",
                price: Number.isFinite(price) ? price : 0,
                availability: data.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                itemCondition: "https://schema.org/NewCondition",
              },
            },
          });
          return;
        }
      }

      const pageMeta: Record<string, { title: string; description: string }> = {
        "/home": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
        "/products": { title: "جميع المنتجات | Flamingo Park", description: "تصفح أحدث منتجات Flamingo Park من الأزياء والحقائب والأحذية والساعات والإكسسوارات." },
        "/brands": { title: "الماركات | Flamingo Park", description: "اكتشف الماركات العالمية المتوفرة في Flamingo Park وتسوق المنتجات حسب الماركة." },
        "/categories": { title: "الأقسام | Flamingo Park", description: "تصفح أقسام Flamingo Park من الحقائب والأحذية والساعات والإكسسوارات والملابس." },
        "/new-arrivals": { title: "وصل حديثاً | Flamingo Park", description: "اكتشف أحدث المنتجات التي وصلت إلى Flamingo Park." },
        "/best-sellers": { title: "الأكثر مبيعاً | Flamingo Park", description: "تسوق المنتجات الأكثر مبيعاً واختياراً لدى عملاء Flamingo Park." },
        "/seasonal-offers": { title: "العروض | Flamingo Park", description: "اكتشف أحدث عروض Flamingo Park والمنتجات المختارة بأسعار مميزة." },
      };

      const meta = pageMeta[pathname] || { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
      if (!cancelled) applySeo({ ...meta, canonical });
    };

    void applyRouteSeo();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
};

export default AnalyticsTracker;
