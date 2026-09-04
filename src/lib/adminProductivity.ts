import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const asJson = (value: Record<string, unknown> | null): Json => value as Json;

export type AdminPreferenceState = {
  favoriteRoutes: string[];
  quickActions: string[];
  dashboardLayout: Record<string, unknown>;
  preferences: Record<string, unknown>;
};

export type WhatsAppTemplate = {
  id: string;
  name: string;
  body: string;
  template_key: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InternalNote = {
  id: string;
  note: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalRequest = {
  id: string;
  request_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_by: string | null;
  reviewed_by: string | null;
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

export type AdminRevision = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

const requireUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول إلى لوحة الإدارة");
  return userId;
};

export const getAdminPreferences = async (): Promise<AdminPreferenceState> => {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("admin_preferences")
    .select("favorite_routes, quick_actions, dashboard_layout, preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return {
    favoriteRoutes: Array.isArray(data?.favorite_routes) ? data.favorite_routes : [],
    quickActions: Array.isArray(data?.quick_actions) ? data.quick_actions : [],
    dashboardLayout: (data?.dashboard_layout as Record<string, unknown> | null) ?? {},
    preferences: (data?.preferences as Record<string, unknown> | null) ?? {},
  };
};

export const saveAdminPreferences = async (state: Partial<AdminPreferenceState>) => {
  const userId = await requireUserId();
  const current = await getAdminPreferences();
  const payload = {
    user_id: userId,
    favorite_routes: state.favoriteRoutes ?? current.favoriteRoutes,
    quick_actions: state.quickActions ?? current.quickActions,
    dashboard_layout: asJson(state.dashboardLayout ?? current.dashboardLayout),
    preferences: asJson(state.preferences ?? current.preferences),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("admin_preferences").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
};

export const listWhatsAppTemplates = async () => {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("id, name, body, template_key, category, is_active, created_at, updated_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WhatsAppTemplate[];
};

export const renderWhatsAppTemplate = (body: string, variables: Record<string, string | number | null | undefined>) =>
  Object.entries(variables).reduce((result, [key, value]) => {
    const replacement = value == null ? "" : String(value);
    return result.split(`{${key}}`).join(replacement);
  }, body);

export const listCustomerInternalNotes = async (customerId: string) => {
  const { data, error } = await supabase
    .from("customer_internal_notes")
    .select("id, note, is_pinned, created_by, created_at, updated_at")
    .eq("customer_id", customerId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InternalNote[];
};

export const addCustomerInternalNote = async (customerId: string, note: string, isPinned = false) => {
  const userId = await requireUserId();
  const cleanNote = note.trim();
  if (!cleanNote) throw new Error("اكتب الملاحظة أولًا");
  const { error } = await supabase.from("customer_internal_notes").insert({
    customer_id: customerId,
    note: cleanNote,
    is_pinned: isPinned,
    created_by: userId,
  });
  if (error) throw error;
};

export const listOrderInternalNotes = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_internal_notes")
    .select("id, note, is_pinned, created_by, created_at, updated_at")
    .eq("order_id", orderId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InternalNote[];
};

export const addOrderInternalNote = async (orderId: string, note: string, isPinned = false) => {
  const userId = await requireUserId();
  const cleanNote = note.trim();
  if (!cleanNote) throw new Error("اكتب الملاحظة أولًا");
  const { error } = await supabase.from("order_internal_notes").insert({
    order_id: orderId,
    note: cleanNote,
    is_pinned: isPinned,
    created_by: userId,
  });
  if (error) throw error;
};

export const recordAdminRevision = async (input: {
  entityType: string;
  entityId: string;
  action: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) => {
  const userId = await requireUserId();
  const { error } = await supabase.from("admin_change_revisions").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    before_data: asJson(input.beforeData ?? null),
    after_data: asJson(input.afterData ?? null),
    metadata: asJson(input.metadata ?? {}),
    created_by: userId,
  });
  if (error) throw error;
};

export const listEntityRevisions = async (entityType: string, entityId: string, limit = 30) => {
  const { data, error } = await supabase
    .from("admin_change_revisions")
    .select("id, entity_type, entity_id, action, before_data, after_data, metadata, created_by, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, limit)));
  if (error) throw error;
  return (data ?? []) as AdminRevision[];
};

export const createApprovalRequest = async (input: {
  requestType: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}) => {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("admin_approval_requests")
    .insert({
      request_type: input.requestType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      payload: asJson(input.payload ?? {}),
      requested_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ApprovalRequest;
};

export const listPendingApprovalRequests = async () => {
  const { data, error } = await supabase
    .from("admin_approval_requests")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApprovalRequest[];
};

export const resolveApprovalRequest = async (id: string, status: "approved" | "rejected", reviewNote?: string) => {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("admin_approval_requests")
    .update({
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote?.trim() || null,
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw error;
};

export const hasAdminPermission = async (permission: string) => {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("admin_user_permissions")
    .select("granted")
    .eq("user_id", userId)
    .eq("permission", permission)
    .maybeSingle();
  if (error) throw error;
  // Backwards-compatible default: existing admins keep full access unless a permission is explicitly denied.
  return data?.granted !== false;
};
