import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { loadCustomerSession } from "@/lib/customerSession";

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

const READ_KEY = "customer_notifications_read_v1";
const DELETED_KEY = "customer_notifications_deleted_v1";

const readLocalSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
};

const saveLocalSet = (key: string, values: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(values)));
  } catch {
    // Ignore localStorage errors.
  }
};

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
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const readIdsRef = useRef<Set<string>>(readLocalSet(READ_KEY));
  const deletedIdsRef = useRef<Set<string>>(readLocalSet(DELETED_KEY));

  useEffect(() => {
    let mounted = true;
    const loadCustomer = async () => {
      const customer = await loadCustomerSession();
      if (!mounted) return;
      setOwnerUserId(customer?.userId || "");
      setCustomerId(customer?.id || "");
    };
    void loadCustomer().catch(() => {
      if (mounted) {
        setOwnerUserId("");
        setCustomerId("");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const notificationsQuery = useQuery({
    queryKey: ["customer-notifications", ownerUserId, customerId],
    enabled: enabled && Boolean(ownerUserId),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async (): Promise<CustomerNotification[]> => {
      let query = supabase
        .from("orders")
        .select("id, order_number, status, updated_at, created_at, owner_user_id")
        .eq("owner_user_id", ownerUserId)
        .order("updated_at", { ascending: false })
        .limit(50);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as Array<{
        id: string;
        order_number: string;
        status: string;
        updated_at: string;
        created_at: string;
      }>;

      const orderNotifs = rows
        .map((row) => {
          const status = normalizeStatus(row.status);
          const key = `order-${row.id}-${status}`;
          if (deletedIdsRef.current.has(key)) return null;

          return {
            id: key,
            type: "order" as const,
            title: statusTitleMap[status] || "تحديث على طلبك",
            message: `${statusMessageMap[status] || "تم تحديث حالة طلبك."} (#${row.order_number})`,
            timestamp: row.updated_at || row.created_at,
            read: readIdsRef.current.has(key),
            actionUrl: `/order-tracking?order=${encodeURIComponent(row.order_number)}`,
          };
        })
        .filter(Boolean) as CustomerNotification[];

      // Also fetch admin-sent customer notifications (broadcasts + targeted)
      let dbNotifs: CustomerNotification[] = [];
      try {
        type NotificationRow = { id: string; title: string; body: string; type: string; link: string | null; is_read: boolean; created_at: string; user_id: string | null; broadcast: boolean };
        const { data: notifRows } = await supabase
          .from("customer_notifications")
          .select("id, title, body, type, link, is_read, created_at, user_id, broadcast")
          .or(`broadcast.eq.true,user_id.eq.${ownerUserId}`)
          .order("created_at", { ascending: false })
          .limit(50);
          

        dbNotifs = ((notifRows || []) as NotificationRow[])
          .filter((row) => !deletedIdsRef.current.has(String(row.id)))
          .map((row) => ({
            id: String(row.id),
            type: (row.type === "order" ? "order" : "system") as NotificationType,
            title: String(row.title || ""),
            message: String(row.body || ""),
            timestamp: String(row.created_at),
            read: Boolean(row.is_read) || readIdsRef.current.has(String(row.id)),
            actionUrl: row.link || undefined,
          }));
      } catch {
        dbNotifs = [];
      }

      return [...orderNotifs, ...dbNotifs];
    },
  });

  useEffect(() => {
    if (!enabled || !enableToasts || !ownerUserId) return;

    const channel = supabase
      .channel(`customer-orders-live-${ownerUserId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `owner_user_id=eq.${ownerUserId}` },
        (payload) => {
          const next = payload.new as { owner_user_id?: string | null; status?: string | null; order_number?: string | null };
          if (String(next.owner_user_id || "") !== ownerUserId) return;

          const status = normalizeStatus(next.status);
          toast({
            title: statusTitleMap[status] || "تحديث على طلبك",
            description: `${statusMessageMap[status] || "تم تحديث حالة طلبك."} (#${String(next.order_number || "")})`,
          });

          notificationsQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, enableToasts, ownerUserId, notificationsQuery]);

  const notifications = useMemo(
    () => [...(notificationsQuery.data || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [notificationsQuery.data]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    readIdsRef.current.add(id);
    saveLocalSet(READ_KEY, readIdsRef.current);
    notificationsQuery.refetch();
  };

  const markAllAsRead = () => {
    notifications.forEach((n) => readIdsRef.current.add(n.id));
    saveLocalSet(READ_KEY, readIdsRef.current);
    notificationsQuery.refetch();
  };

  const deleteNotification = (id: string) => {
    deletedIdsRef.current.add(id);
    saveLocalSet(DELETED_KEY, deletedIdsRef.current);
    notificationsQuery.refetch();
  };

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: notificationsQuery.refetch,
  };
};
