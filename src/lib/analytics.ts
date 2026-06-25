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

export async function track(payload: TrackPayload) {
  try {
    const utm = getStoredUTM();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
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

    // Forward to Google Analytics (gtag) when present
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
    // Never let analytics break the app
    if (import.meta.env.DEV) console.warn("[analytics] track failed", err);
  }
}

export async function logAudit(action: string, entity_type: string, entity_id?: string, details?: Record<string, any>) {
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