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
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => {
      const v = url.searchParams.get(k);
      if (v) (utm as any)[k] = v;
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
  metadata?: Record<string, any>;
};

export async function track(payload: TrackPayload): Promise<boolean> {
  let persisted = false;

  try {
    const utm = getStoredUTM();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("analytics_events").insert({
      event_type: payload.event_type,
      session_id: getSessionId(),
      user_id: user?.id ?? null,
      path: payload.path ?? window.location.pathname,
      referrer: utm.referrer ?? null,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_content: utm.utm_content ?? null,
      device: getDevice(),
      country: null,
      product_id: payload.product_id ?? null,
      order_id: payload.order_id ?? null,
      value: payload.value ?? null,
      metadata: payload.metadata ?? {},
    });

    if (error) throw error;
    persisted = true;
  } catch (err) {
    // Analytics must never block or break storefront actions.
    if (import.meta.env.DEV) console.warn("[analytics] database track failed", err);
  }

  try {
    const gtag = (window as any).gtag;
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
    if (import.meta.env.DEV) console.warn("[analytics] gtag forward failed", err);
  }

  return persisted;
}

export async function recordPurchaseAnalytics(orderId: string, trackingToken: string): Promise<boolean> {
  if (!orderId || !trackingToken) return false;

  try {
    const utm = getStoredUTM();
    const { data, error } = await (supabase as any).rpc("record_purchase_analytics", {
      p_order_id: orderId,
      p_tracking_token: trackingToken,
      p_session_id: getSessionId(),
      p_path: window.location.pathname,
      p_referrer: utm.referrer ?? null,
      p_utm_source: utm.utm_source ?? null,
      p_utm_medium: utm.utm_medium ?? null,
      p_utm_campaign: utm.utm_campaign ?? null,
      p_utm_content: utm.utm_content ?? null,
      p_device: getDevice(),
    });

    if (error) throw error;
    return data === true;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[analytics] verified purchase track failed", err);
    return false;
  }
}

export async function logAudit(action: string, entity_type: string, entity_id?: string, details?: Record<string, any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action,
      entity_type,
      entity_id: entity_id ?? null,
      details: details ?? {},
    });
    if (error) throw error;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[audit] log failed", err);
  }
}
