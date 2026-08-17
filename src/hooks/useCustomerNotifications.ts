import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCustomerSession } from "@/lib/customerSession";

type NotificationType = "order" | "system";

export interface CustomerNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

type NotificationState = { notification_key: string; is_read: boolean; is_deleted: boolean };

const statusTitleMap: Record<string, string> = {
  pending: "تم استلام طلبك",
  confirmed: "تم تأكيد الطلب",
  processing: "الطلب قيد المعالجة",
  shipped: "تم شحن الطلب",
  delivered: "تم تسليم الطلب",
  cancelled: "تم إلغاء الطلب",
  canceled: "تم إلغاء الطلب",
};

const statusMessageMap: Record<string, string> = {
  pending: "طلبك قيد المراجعة حالياً.",
  confirmed: "تم تأكيد طلبك وسيبدأ تجهيزه.",
  processing: "طلبك الآن في مرحلة التجهيز.",
  shipped: "طلبك خرج مع شركة الشحن.",
  delivered: "تم تسليم طلبك بنجاح.",
  cancelled: "تم إلغاء الطلب. تواصل معنا إذا كان هناك خطأ.",
  canceled: "تم إلغاء الطلب. تواصل معنا إذا كان هناك خطأ.",
};

const normalizeStatus = (raw: string | null | undefined) => String(raw || "pending").toLowerCase();

interface UseCustomerNotificationsOptions {
  enabled?: boolean;
  enableToasts?: boolean;
}

export const useCustomerNotifications = (options: UseCustomerNotificationsOptions = {}) => {
  const { enabled = true, enableToasts = false } = options;
  const [authUserId, setAuthUserId] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadCustomer = async () => {
      const session = getCustomerSession();
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthUserId(String(data.user?.id || session?.user_id || "").trim());
      setCustomerId(String(session?.id || "").trim());
      setUserPhone(String(session?.phone || data.user?.phone || "").trim());
    };
    void loadCustomer();
    return () => { mounted = false; };
  }, []);

  const notificationsQuery = useQuery({
    queryKey: ["customer-notifications", authUserId, userPhone, customerId],
    enabled: enabled && Boolean(authUserId),
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CustomerNotification[]> => {
      const { data: stateRows } = await (supabase as any).from("customer_notification_states").select("notification_key,is_read,is_deleted").eq("user_id", authUserId);
      const stateMap = new Map<string, NotificationState>(((stateRows || []) as NotificationState[]).map((row) => [String(row.notification_key), row]));

      const { data, error } = await supabase.from("orders").select("id, order_number, status, updated_at, created_at, tracking_token").order("updated_at", { ascending: false }).limit(50);
      if (error) throw error;

      const rows = (data || []) as Array<{ id: string; order_number: string; status: string; updated_at: string; created_at: string; tracking_token: string | null }>;
      const orderNotifs = rows.map((row) => {
        const status = normalizeStatus(row.status);
        const key = `order-${row.id}-${status}`;
        const state = stateMap.get(key);
        if (state?.is_deleted) return null;
        return {
          id: key,
          type: "order" as const,
          title: statusTitleMap[status] || "تحديث على طلبك",
          message: `${statusMessageMap[status] || "تم تحديث حالة طلبك."} (#${row.order_number})`,
          timestamp: row.updated_at || row.created_at,
          read: Boolean(state?.is_read),
          actionUrl: row.tracking_token ? `/order-tracking?order=${encodeURIComponent(row.order_number)}&token=${encodeURIComponent(row.tracking_token)}` : "/my-orders",
        };
      }).filter(Boolean) as CustomerNotification[];

      let dbNotifs: CustomerNotification[] = [];
      try {
        const filters: string[] = ["broadcast.eq.true"];
        if (authUserId) filters.push(`user_id.eq.${authUserId}`);
        if (customerId) filters.push(`customer_id.eq.${customerId}`);
        if (userPhone) filters.push(`customer_phone.eq.${userPhone}`);

        type NotificationRow = { id: string; title: string; body: string | null; message?: string | null; type: string; link: string | null; is_read: boolean; created_at: string };
        const { data: notifRows } = await (supabase as any).from("customer_notifications").select("id,title,body,message,type,link,is_read,created_at").or(filters.join(",")).order("created_at", { ascending: false }).limit(50);

        dbNotifs = ((notifRows || []) as NotificationRow[]).map((row) => {
          const key = String(row.id);
          const state = stateMap.get(key);
          if (state?.is_deleted) return null;
          return {
            id: key,
            type: (row.type === "order" ? "order" : "system") as NotificationType,
            title: String(row.title || ""),
            message: String(row.body || row.message || ""),
            timestamp: String(row.created_at),
            read: Boolean(row.is_read) || Boolean(state?.is_read),
            actionUrl: row.link || undefined,
          };
        }).filter(Boolean) as CustomerNotification[];
      } catch {
        dbNotifs = [];
      }

      return [...orderNotifs, ...dbNotifs];
    },
  });

  useEffect(() => {
    if (!enabled || !enableToasts || !authUserId) return;
    const channel = supabase.channel(`customer-orders-live-${authUserId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
      const next = payload.new as { owner_user_id?: string | null; customer_id?: string | null; customer_phone?: string | null; status?: string | null; order_number?: string | null };
      const ownerMatch = String(next.owner_user_id || "") === authUserId || Boolean(customerId && String(next.customer_id || "") === customerId) || Boolean(userPhone && String(next.customer_phone || "") === userPhone);
      if (!ownerMatch) return;
      const status = normalizeStatus(next.status);
      toast({ title: statusTitleMap[status] || "تحديث على طلبك", description: `${statusMessageMap[status] || "تم تحديث حالة طلبك."} (#${String(next.order_number || "")})` });
      void notificationsQuery.refetch();
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, enableToasts, authUserId, customerId, userPhone]);

  const notifications = useMemo(() => [...(notificationsQuery.data || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [notificationsQuery.data]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const saveState = async (id: string, patch: { is_read?: boolean; is_deleted?: boolean }) => {
    if (!authUserId) return;
    await (supabase as any).from("customer_notification_states").upsert({ user_id: authUserId, notification_key: id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id,notification_key" });
    if (patch.is_read && !id.startsWith("order-")) await (supabase as any).from("customer_notifications").update({ is_read: true }).eq("id", id);
    await notificationsQuery.refetch();
  };

  const markAsRead = (id: string) => { void saveState(id, { is_read: true }); };
  const deleteNotification = (id: string) => { void saveState(id, { is_deleted: true, is_read: true }); };
  const markAllAsRead = () => {
    if (!authUserId || notifications.length === 0) return;
    void (async () => {
      await (supabase as any).from("customer_notification_states").upsert(notifications.map((notification) => ({ user_id: authUserId, notification_key: notification.id, is_read: true, is_deleted: false, updated_at: new Date().toISOString() })), { onConflict: "user_id,notification_key" });
      const dbIds = notifications.filter((notification) => !notification.id.startsWith("order-")).map((notification) => notification.id);
      if (dbIds.length) await (supabase as any).from("customer_notifications").update({ is_read: true }).in("id", dbIds);
      await notificationsQuery.refetch();
    })();
  };

  return { notifications, unreadCount, isLoading: notificationsQuery.isLoading, markAsRead, markAllAsRead, deleteNotification, refetch: notificationsQuery.refetch };
};
