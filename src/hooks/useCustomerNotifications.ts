import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCustomerSession } from "@/lib/customerSession";

type NotificationType = "order" | "system";
export interface CustomerNotification { id: string; type: NotificationType; title: string; message: string; timestamp: string; read: boolean; actionUrl?: string; dbId?: string }

const READ_KEY = "customer_notifications_read_v2";
const DELETED_KEY = "customer_notifications_deleted_v2";
const readLocalSet = (key: string) => { try { const raw = localStorage.getItem(key); return new Set<string>(raw ? JSON.parse(raw).map(String) : []); } catch { return new Set<string>(); } };
const saveLocalSet = (key: string, values: Set<string>) => { try { localStorage.setItem(key, JSON.stringify(Array.from(values))); } catch { /* noop */ } };
const statusTitleMap: Record<string, string> = { pending: "تم استلام طلبك", confirmed: "تم تأكيد الطلب", processing: "الطلب قيد المعالجة", shipped: "تم شحن الطلب", delivered: "تم تسليم الطلب", cancelled: "تم إلغاء الطلب", canceled: "تم إلغاء الطلب" };
const statusMessageMap: Record<string, string> = { pending: "طلبك قيد المراجعة حالياً.", confirmed: "تم تأكيد طلبك وسيبدأ تجهيزه.", processing: "طلبك الآن في مرحلة التجهيز.", shipped: "طلبك خرج مع شركة الشحن.", delivered: "تم تسليم طلبك بنجاح.", cancelled: "تم إلغاء الطلب. تواصل معنا إذا كان هناك خطأ.", canceled: "تم إلغاء الطلب. تواصل معنا إذا كان هناك خطأ." };
const normalizeStatus = (raw: string | null | undefined) => String(raw || "pending").toLowerCase();

interface UseCustomerNotificationsOptions { enabled?: boolean; enableToasts?: boolean }

export const useCustomerNotifications = (options: UseCustomerNotificationsOptions = {}) => {
  const { enabled = true, enableToasts = false } = options;
  const [authUserId, setAuthUserId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const readIdsRef = useRef<Set<string>>(readLocalSet(READ_KEY));
  const deletedIdsRef = useRef<Set<string>>(readLocalSet(DELETED_KEY));

  useEffect(() => {
    let active = true;
    const loadIdentity = async () => {
      const session = getCustomerSession();
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setAuthUserId(String(data.user?.id || session?.user_id || ""));
      setCustomerId(String(session?.id || ""));
    };
    void loadIdentity();
    return () => { active = false; };
  }, []);

  const notificationsQuery = useQuery({
    queryKey: ["customer-notifications", authUserId, customerId],
    enabled: enabled && Boolean(authUserId),
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CustomerNotification[]> => {
      const { data: orders, error: orderError } = await (supabase as any).from("orders").select("id,order_number,status,updated_at,created_at,tracking_token").eq("owner_user_id", authUserId).order("updated_at", { ascending: false }).limit(50);
      if (orderError) throw orderError;

      const orderNotifs = ((orders || []) as any[]).map((row) => {
        const status = normalizeStatus(row.status);
        const key = `order-${row.id}-${status}`;
        if (deletedIdsRef.current.has(key)) return null;
        return { id: key, type: "order" as const, title: statusTitleMap[status] || "تحديث على طلبك", message: `${statusMessageMap[status] || "تم تحديث حالة طلبك."} (#${row.order_number})`, timestamp: row.updated_at || row.created_at, read: readIdsRef.current.has(key), actionUrl: row.tracking_token ? `/order-tracking?order=${encodeURIComponent(row.order_number)}&token=${encodeURIComponent(row.tracking_token)}` : "/my-orders" };
      }).filter(Boolean) as CustomerNotification[];

      const { data: rows } = await (supabase as any).from("customer_notifications").select("id,title,body,message,type,link,is_read,created_at").order("created_at", { ascending: false }).limit(50);
      const dbNotifs = ((rows || []) as any[]).filter((row) => !deletedIdsRef.current.has(String(row.id))).map((row) => ({ id: String(row.id), dbId: String(row.id), type: row.type === "order" ? "order" as const : "system" as const, title: String(row.title || ""), message: String(row.body || row.message || ""), timestamp: String(row.created_at), read: Boolean(row.is_read) || readIdsRef.current.has(String(row.id)), actionUrl: row.link || undefined }));
      return [...orderNotifs, ...dbNotifs];
    },
  });

  useEffect(() => {
    if (!enabled || !enableToasts || !authUserId) return;
    const channel = supabase.channel(`customer-orders-live-${authUserId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `owner_user_id=eq.${authUserId}` }, (payload) => {
      const next = payload.new as { status?: string | null; order_number?: string | null };
      const status = normalizeStatus(next.status);
      toast({ title: statusTitleMap[status] || "تحديث على طلبك", description: `${statusMessageMap[status] || "تم تحديث حالة طلبك."} (#${String(next.order_number || "")})` });
      void notificationsQuery.refetch();
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [authUserId, enableToasts, enabled]);

  const notifications = useMemo(() => [...(notificationsQuery.data || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [notificationsQuery.data]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAsRead = async (id: string) => {
    readIdsRef.current.add(id); saveLocalSet(READ_KEY, readIdsRef.current);
    if (/^[0-9a-f-]{36}$/i.test(id)) await (supabase as any).from("customer_notifications").update({ is_read: true, updated_at: new Date().toISOString() }).eq("id", id);
    await notificationsQuery.refetch();
  };
  const markAllAsRead = async () => {
    notifications.forEach((notification) => readIdsRef.current.add(notification.id)); saveLocalSet(READ_KEY, readIdsRef.current);
    const dbIds = notifications.map((notification) => notification.dbId).filter(Boolean) as string[];
    if (dbIds.length) await (supabase as any).from("customer_notifications").update({ is_read: true, updated_at: new Date().toISOString() }).in("id", dbIds);
    await notificationsQuery.refetch();
  };
  const deleteNotification = async (id: string) => { deletedIdsRef.current.add(id); saveLocalSet(DELETED_KEY, deletedIdsRef.current); await notificationsQuery.refetch(); };

  return { notifications, unreadCount, isLoading: notificationsQuery.isLoading, markAsRead, markAllAsRead, deleteNotification, refetch: notificationsQuery.refetch };
};
