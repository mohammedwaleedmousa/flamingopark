import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { ADMIN_BASE_PATH } from "@/lib/adminRoutes";

// Keep realtime focused on data where a near-instant storefront refresh matters.
// Static content (brands, banners, CMS copy, settings, campaigns, etc.) already
// uses React Query caching and does not need a permanent realtime subscription
// on every customer's device.
const STOREFRONT_REALTIME_TABLES = [
  "products",
  "inventory_skus",
  "size_price_rules",
] as const;

const ORDER_QUERY_HINTS = ["order", "shipment", "checkout", "notification"] as const;
const ORDER_REALTIME_PATHS = [
  "/checkout",
  "/order-confirmation",
  "/my-orders",
  "/my-shipments",
  "/order-tracking",
] as const;

const isOrderFacingQuery = (queryKey: readonly unknown[]) => {
  const firstKey = String(queryKey[0] ?? "").toLowerCase();
  return ORDER_QUERY_HINTS.some((hint) => firstKey.includes(hint));
};

const shouldSubscribeToOrders = (pathname: string) =>
  ORDER_REALTIME_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const StorefrontRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const refreshTimerRef = useRef<number | null>(null);
  const pendingStorefrontRefreshRef = useRef(false);
  const pendingOrderRefreshRef = useRef(false);
  const dirtyWhileHiddenRef = useRef(false);

  const enabled = !pathname.startsWith(ADMIN_BASE_PATH);
  const ordersEnabled = enabled && shouldSubscribeToOrders(pathname);

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
          void queryClient.invalidateQueries({
            predicate: (query) => {
              const key = String(query.queryKey[0] ?? "").toLowerCase();
              return key.includes("product") || key.includes("catalog") || key.includes("inventory");
            },
            refetchType: "none",
          });
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
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const key = String(query.queryKey[0] ?? "").toLowerCase();
            return key.includes("product") || key.includes("catalog") || key.includes("inventory");
          },
          refetchType: "active",
        });
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

      // Batch bursts of stock/product changes into a single cache refresh.
      refreshTimerRef.current = window.setTimeout(flushRefresh, 500);
    };

    let channel = supabase.channel(`storefront-live-critical-v2:${ordersEnabled ? "orders" : "catalog"}`);

    for (const table of STOREFRONT_REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => scheduleRefresh("storefront"),
      );
    }

    if (ordersEnabled) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => scheduleRefresh("orders"),
      );
    }

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Storefront realtime channel degraded:", status);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !dirtyWhileHiddenRef.current) return;
      dirtyWhileHiddenRef.current = false;

      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = String(query.queryKey[0] ?? "").toLowerCase();
          return (
            key.includes("product") ||
            key.includes("catalog") ||
            key.includes("inventory") ||
            (ordersEnabled && isOrderFacingQuery(query.queryKey))
          );
        },
        refetchType: "active",
      });
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
  }, [enabled, ordersEnabled, queryClient]);

  return null;
};

export default StorefrontRealtimeSync;
