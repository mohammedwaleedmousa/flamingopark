import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  enableToasts?: boolean;
}

export const useCustomerNotifications = (options: UseCustomerNotificationsOptions = {}) => {
  const { enableToasts = false } = options;
  const [userId, setUserId] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string>("");
  const readIdsRef = useRef<Set<string>>(readLocalSet(READ_KEY));
  const deletedIdsRef = useRef<Set<string>>(readLocalSet(DELETED_KEY));

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = String(data.user?.id || "").trim();
      const phone = String(data.user?.user_metadata?.phone_number || "").trim();
      setUserId(uid);
      setUserPhone(phone);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = String(session?.user?.id || "").trim();
      const phone = String(session?.user?.user_metadata?.phone_number || "").trim();
      setUserId(uid);
      setUserPhone(phone);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const notificationsQuery = useQuery({
    queryKey: ["customer-notifications", userId, userPhone],
    enabled: !!(userId || userPhone),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async (): Promise<CustomerNotification[]> => {
      let query = supabase
        .from("orders")
        .select("id, order_number, status, updated_at, created_at, customer_id, customer_phone")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (userPhone) {
        query = query.or(`customer_id.eq.${userId},customer_phone.eq.${userPhone}`);
      } else if (userId) {
        query = query.eq("customer_id", userId);
      }

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
        const filters: string[] = ["broadcast.eq.true"];
        if (userId) filters.push(`customer_id.eq.${userId}`);
        if (userPhone) filters.push(`customer_phone.eq.${userPhone}`);

        const { data: notifRows } = await (supabase as any)
          .from("customer_notifications")
          .select("id, title, body, type, link, is_read, created_at")
          .or(filters.join(","))
          .order("created_at", { ascending: false })
          .limit(50);

        dbNotifs = (notifRows || [])
          .filter((r: any) => !deletedIdsRef.current.has(String(r.id)))
          .map((r: any) => ({
            id: String(r.id),
            type: (r.type === "order" ? "order" : "system") as NotificationType,
            title: String(r.title || ""),
            message: String(r.body || ""),
            timestamp: String(r.created_at),
            read: Boolean(r.is_read) || readIdsRef.current.has(String(r.id)),
            actionUrl: r.link || undefined,
          }));
      } catch {
        dbNotifs = [];
      }

      return [...orderNotifs, ...dbNotifs];
    },
  });

  useEffect(() => {
    if (!enableToasts || !(userId || userPhone)) return;

    const channel = supabase
      .channel(`customer-orders-live-${userId || "anon"}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const next = payload.new as { customer_id?: string | null; customer_phone?: string | null; status?: string | null; order_number?: string | null };
          const ownerMatch = (userId && String(next.customer_id || "") === userId) || (userPhone && String(next.customer_phone || "") === userPhone);
          if (!ownerMatch) return;

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
  }, [enableToasts, userId, userPhone, notificationsQuery]);

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
