import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "fl-session-id";
const UTM_KEY = "fl-utm";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

type UTM = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referrer?: string;
};

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const [id, ts] = raw.split("|");
      if (id && ts && Date.now() - Number(ts) < SESSION_TTL_MS) {
        sessionStorage.setItem(SESSION_KEY, `${id}|${Date.now()}`);
        return id;
      }
    }
    const id = uuid();
    sessionStorage.setItem(SESSION_KEY, `${id}|${Date.now()}`);
    return id;
  } catch {
    return uuid();
  }
}

function getDevice(): string {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function captureUTM() {
  try {
    const url = new URL(window.location.href);
    const utm: UTM = {};
    const keys: Array<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content"> = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
    keys.forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) utm[key] = value;
    });
    if (document.referrer && !document.referrer.includes(window.location.host)) {
      utm.referrer = document.referrer;
    }
    if (Object.keys(utm).length) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    }
    return getStoredUTM();
  } catch {
    return {} as UTM;
  }
}

function getStoredUTM(): UTM {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

type TrackPayload = {
  event_type:
    | "page_view"
    | "product_view"
    | "add_to_cart"
    | "remove_from_cart"
    | "begin_checkout"
    | "purchase"
    | "search"
    | "add_to_wishlist"
    | "ad_click";
  path?: string;
  product_id?: string | null;
  order_id?: string | null;
  value?: number | null;
  metadata?: Record<string, unknown>;
};

export async function track(payload: TrackPayload) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const utm = getStoredUTM();
      const { error } = await supabase.functions.invoke("analytics-event", { body: {
        eventType: payload.event_type,
        sessionId: getSessionId(),
        path: payload.path ?? window.location.pathname,
        referrer: utm.referrer ?? null,
        utmSource: utm.utm_source ?? null,
        utmMedium: utm.utm_medium ?? null,
        utmCampaign: utm.utm_campaign ?? null,
        utmContent: utm.utm_content ?? null,
        device: getDevice(),
        productId: payload.product_id ?? null,
        orderId: payload.order_id ?? null,
        value: payload.value ?? null,
        metadata: payload.metadata ?? {},
      } });
      if (error) throw error;
    }
  } catch (err) {
    // Never let analytics break the app
    if (import.meta.env.DEV) console.warn("[analytics] track failed", err);
  }

  try {
    // Forward to Google Analytics (gtag) when present
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag === "function") {
      gtag("event", payload.event_type, {
        page_path: payload.path,
        value: payload.value ?? undefined,
        product_id: payload.product_id ?? undefined,
        order_id: payload.order_id ?? undefined,
        ...payload.metadata,
      });
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[analytics] gtag failed", err);
  }
}

export async function logAudit(action: string, entity_type: string, entity_id?: string, details?: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action,
      entity_type,
      entity_id: entity_id ?? null,
      details: details ?? {},
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[audit] log failed", err);
  }
}
