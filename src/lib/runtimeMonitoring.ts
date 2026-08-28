import { supabase } from "@/integrations/supabase/client";

const SLOW_RESOURCE_MS = 5_000;
const MAX_EVENTS_PER_SESSION = 12;
const COUNTER_KEY = "fl-runtime-monitor-count";

const getDevice = () => {
  if (typeof window === "undefined") return "unknown";
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
};

const canSend = () => {
  try {
    const current = Number(sessionStorage.getItem(COUNTER_KEY) || "0");
    if (current >= MAX_EVENTS_PER_SESSION) return false;
    sessionStorage.setItem(COUNTER_KEY, String(current + 1));
    return true;
  } catch {
    return true;
  }
};

const safeText = (value: unknown, max = 600) => String(value ?? "").slice(0, max);

const report = async (eventType: "client_error" | "slow_resource", value: number | null, metadata: Record<string, unknown>) => {
  if (!canSend()) return;

  try {
    await (supabase as any).from("analytics_events").insert({
      event_type: eventType,
      session_id: null,
      user_id: null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      device: getDevice(),
      country: null,
      value,
      metadata: {
        ...metadata,
        user_agent: typeof navigator !== "undefined" ? safeText(navigator.userAgent, 300) : null,
      },
    });
  } catch {
    // Monitoring must never affect the storefront.
  }
};

let started = false;

export const startRuntimeMonitoring = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("error", (event) => {
    void report("client_error", null, {
      message: safeText(event.message),
      filename: safeText(event.filename, 300),
      line: event.lineno || null,
      column: event.colno || null,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : event.reason;
    void report("client_error", null, {
      message: safeText(reason),
      source: "unhandledrejection",
    });
  });

  if (typeof PerformanceObserver === "undefined") return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType !== "resource" || entry.duration < SLOW_RESOURCE_MS) continue;

        const resource = entry as PerformanceResourceTiming;
        const name = safeText(resource.name, 900);
        const isProductImage = /\/color-variants\/|\/media\//i.test(name);
        const isImage = resource.initiatorType === "img" || /\.(?:jpe?g|png|webp|avif|heic)(?:\?|$)/i.test(name);

        if (!isProductImage && !isImage) continue;

        void report("slow_resource", Math.round(resource.duration), {
          resource: name,
          initiator_type: resource.initiatorType,
          transfer_size: resource.transferSize || null,
          encoded_body_size: resource.encodedBodySize || null,
          decoded_body_size: resource.decodedBodySize || null,
        });
      }
    });

    observer.observe({ type: "resource", buffered: true });
  } catch {
    // Older browsers may not support buffered resource observation.
  }
};
