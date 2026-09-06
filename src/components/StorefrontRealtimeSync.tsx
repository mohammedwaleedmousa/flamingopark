import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { ADMIN_BASE_PATH } from "@/lib/adminRoutes";

const STOREFRONT_TABLES = [
  "products",
  "inventory_skus",
  "size_price_rules",
  "categories",
  "brands",
  "brand_categories",
  "brand_pages",
  "brand_banners",
  "brand_sections",
  "brand_filters",
  "product_brand_filters",
  "brand_section_pages",
  "brand_section_products",
  "banners",
  "homepage_sections",
  "site_settings",
  "site_content",
  "offers",
  "offers_settings",
  "campaign_pages",
  "delivery_companies",
  "cod_regions",
  "payment_methods",
  "currencies",
  "countries",
  "product_reviews",
  "reviews",
  "product_questions",
] as const;

const ORDER_QUERY_HINTS = ["order", "shipment", "checkout", "notification"] as const;

const isOrderFacingQuery = (queryKey: readonly unknown[]) => {
  const firstKey = String(queryKey[0] ?? "").toLowerCase();
  return ORDER_QUERY_HINTS.some((hint) => firstKey.includes(hint));
};

const StorefrontRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const refreshTimerRef = useRef<number | null>(null);
  const pendingStorefrontRefreshRef = useRef(false);
  const pendingOrderRefreshRef = useRef(false);
  const dirtyWhileHiddenRef = useRef(false);

  const enabled = !pathname.startsWith(ADMIN_BASE_PATH);

  useEffect(() => {
    if (!enabled) return;

    const flushRefresh = () => {
      refreshTimerRef.current = null;

      const refreshStorefront = pendingStorefrontRefreshRef.current;
      const refreshOrders = pendingOrderRefreshRef.current;

      pendingStorefrontRefreshRef.current = false;
      pendingOrderRefreshRef.current = false;

      if (!refreshStorefront && !refreshOrders) return;

      if (document.visibilityState === "hidden") {
        dirtyWhileHiddenRef.current = true;

        if (refreshStorefront) {
          void queryClient.invalidateQueries({ refetchType: "none" });
        } else if (refreshOrders) {
          void queryClient.invalidateQueries({
            predicate: (query) => isOrderFacingQuery(query.queryKey),
            refetchType: "none",
          });
        }

        return;
      }

      dirtyWhileHiddenRef.current = false;

      if (refreshStorefront) {
        void queryClient.invalidateQueries({ refetchType: "active" });
        return;
      }

      if (refreshOrders) {
        void queryClient.invalidateQueries({
          predicate: (query) => isOrderFacingQuery(query.queryKey),
          refetchType: "active",
        });
      }
    };

    const scheduleRefresh = (scope: "storefront" | "orders") => {
      if (scope === "storefront") pendingStorefrontRefreshRef.current = true;
      if (scope === "orders") pendingOrderRefreshRef.current = true;

      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(flushRefresh, 180);
    };

    let channel = supabase.channel("storefront-live-content-v1");

    for (const table of STOREFRONT_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => scheduleRefresh("storefront"),
      );
    }

    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => scheduleRefresh("orders"),
    );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Storefront realtime channel degraded:", status);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !dirtyWhileHiddenRef.current) return;
      dirtyWhileHiddenRef.current = false;
      void queryClient.invalidateQueries({ refetchType: "active" });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return null;
};

export default StorefrontRealtimeSync;
