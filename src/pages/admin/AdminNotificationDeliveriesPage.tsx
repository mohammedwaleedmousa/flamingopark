import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Activity, Bell, CheckCircle2, CircleOff, Clock3, Eye, Loader2, MessageCircle, RefreshCw, RotateCw, Search, XCircle, type LucideIcon } from "lucide-react";

type DeliveryChannel = "inapp" | "whatsapp";
type DeliveryStatus = "pending" | "sent" | "failed" | "read";
type StatusFilter = "all" | DeliveryStatus;
type ChannelFilter = "all" | DeliveryChannel;
type SortMode = "newest" | "oldest" | "attempts_high";

interface DeliveryRow {
  id: string;
  notification_id: string;
  customer_id: string | null;
  customer_phone: string | null;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number;
  last_error: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  payload: Record<string, unknown> | null;
}

interface NotificationLite {
  id: string;
  title: string;
  body: string | null;
  message: string;
  broadcast: boolean;
}

interface CustomerLite {
  id: string;
  name: string;
}

interface DeliveryView extends DeliveryRow {
  notif_title: string;
  notif_body: string;
  broadcast: boolean;
  customer_name: string;
}

const AdminNotificationDeliveriesPage = () => {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [search, setSearch] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const deliveriesQuery = useQuery({
    queryKey: ["admin-notification-deliveries"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("notification_deliveries").select("id,notification_id,customer_id,customer_phone,channel,status,attempts,last_error,delivered_at,read_at,created_at,updated_at,payload").order("created_at", { ascending: false }).limit(300);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        channel: row.channel as DeliveryChannel,
        status: row.status as DeliveryStatus,
        attempts: Number(row.attempts || 0),
      })) as DeliveryRow[];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const deliveries = deliveriesQuery.data || [];

  const notificationIds = useMemo(() => Array.from(new Set(deliveries.map((row) => row.notification_id).filter(Boolean))), [deliveries]);
  const customerIds = useMemo(() => Array.from(new Set(deliveries.map((row) => row.customer_id).filter(Boolean))) as string[], [deliveries]);

  const notificationsQuery = useQuery({
    queryKey: ["admin-delivery-notifications", notificationIds.join(",")],
    enabled: notificationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customer_notifications").select("id,title,body,message,broadcast").in("id", notificationIds);

      if (error) throw error;

      return (data || []) as NotificationLite[];
    },
    staleTime: 30_000,
  });

  const customersQuery = useQuery({
    queryKey: ["admin-delivery-customers", customerIds.join(",")],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name").in("id", customerIds);

      if (error) throw error;

      return (data || []) as CustomerLite[];
    },
    staleTime: 60_000,
  });

  const rows = useMemo<DeliveryView[]>(() => {
    const notificationsMap = new Map((notificationsQuery.data || []).map((notification) => [notification.id, notification]));
    const customersMap = new Map((customersQuery.data || []).map((customer) => [customer.id, customer]));

    return deliveries.map((row) => {
      const notification = notificationsMap.get(row.notification_id);
      const customer = row.customer_id ? customersMap.get(row.customer_id) : null;
      const payloadTitle = typeof row.payload?.title === "string" ? row.payload.title : "";
      const payloadBody = typeof row.payload?.body === "string" ? row.payload.body : "";

      return {
        ...row,
        notif_title: notification?.title || payloadTitle || "إشعار بدون عنوان",
        notif_body: notification?.body || notification?.message || payloadBody || "",
        broadcast: Boolean(notification?.broadcast),
        customer_name: row.customer_id ? customer?.name || "عميل غير معروف" : "بث عام",
      };
    });
  }, [deliveries, notificationsQuery.data, customersQuery.data]);

  useEffect(() => {
    const channel = (supabase as any).channel("admin-notification-deliveries-live").on("postgres_changes", { event: "*", schema: "public", table: "notification_deliveries" }, () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification-deliveries"] });
    }).subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [queryClient]);

  const stats = useMemo(() => {
    const pending = rows.filter((row) => row.status === "pending").length;
    const sent = rows.filter((row) => row.status === "sent").length;
    const read = rows.filter((row) => row.status === "read").length;
    const failed = rows.filter((row) => row.status === "failed").length;

    return {
      total: rows.length,
      pending,
      sent,
      read,
      failed,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = rows.filter((row) => {
      const searchable = `${row.notif_title} ${row.notif_body} ${row.customer_name} ${row.customer_phone || ""}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesChannel = channelFilter === "all" || row.channel === channelFilter;

      return matchesSearch && matchesStatus && matchesChannel;
    });

    return [...result].sort((a, b) => {
      if (sortMode === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortMode === "attempts_high") return b.attempts - a.attempts;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rows, search, statusFilter, channelFilter, sortMode]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-notification-deliveries"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-customers"] }),
    ]);

    toast({ title: "تم تحديث سجل التسليم" });
  };

  const retryWhatsApp = async (row: DeliveryView) => {
    if (row.channel !== "whatsapp") return;

    const phone = normalizeWhatsappPhone(row.customer_phone || "");

    if (!phone) {
      toast({ title: "رقم الهاتف غير صالح", description: "لا يمكن فتح واتساب بدون رقم صحيح.", variant: "destructive" });
      return;
    }

    setRetryingId(row.id);

    try {
      const message = buildWhatsAppMessage(row);
      const popup = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      const nextAttempts = row.attempts + 1;

      if (!popup) {
        const { error } = await (supabase as any).from("notification_deliveries").update({
          status: "failed",
          attempts: nextAttempts,
          last_error: "تعذر فتح نافذة واتساب؛ قد يكون المتصفح منع النافذة المنبثقة.",
          delivered_at: null,
        }).eq("id", row.id);

        if (error) throw error;

        toast({ title: "تعذر فتح واتساب", description: "تحقق من إعدادات النوافذ المنبثقة في المتصفح.", variant: "destructive" });
      } else {
        const { error } = await (supabase as any).from("notification_deliveries").update({
          status: "pending",
          attempts: nextAttempts,
          last_error: null,
          delivered_at: null,
        }).eq("id", row.id);

        if (error) throw error;

        toast({ title: "تم فتح واتساب", description: "تم تسجيل المحاولة فقط، ولن تُعتبر الرسالة مُسلّمة حتى توجد آلية تأكيد فعلية." });
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-notification-deliveries"] });
    } catch (error: any) {
      const nextAttempts = row.attempts + 1;

      await (supabase as any).from("notification_deliveries").update({
        status: "failed",
        attempts: nextAttempts,
        last_error: String(error?.message || error || "حدث خطأ"),
        delivered_at: null,
      }).eq("id", row.id);

      await queryClient.invalidateQueries({ queryKey: ["admin-notification-deliveries"] });

      toast({ title: "فشلت محاولة واتساب", description: error?.message || "حدث خطأ غير متوقع.", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setChannelFilter("all");
    setSortMode("newest");
  };

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || channelFilter !== "all" || sortMode !== "newest";
  const isLoading = deliveriesQuery.isLoading;
  const isFetching = deliveriesQuery.isFetching || notificationsQuery.isFetching || customersQuery.isFetching;

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التسويق والاتصال" title="سجل تسليم الإشعارات" description="تتبع محاولات التسليم داخل المتجر وواتساب وحالات الإرسال والقراءة" actions={[{ label: "الإشعارات", icon: Bell, href: "/admin/customer-notifications", variant: "outline" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي السجلات" value={stats.total.toLocaleString("en-US")} helper={`${stats.pending} قيد المتابعة`} icon={Activity} tone="indigo" />
        <StatCard title="مرسلة" value={stats.sent.toLocaleString("en-US")} helper="حالة sent في السجل" icon={CheckCircle2} tone="blue" />
        <StatCard title="مقروءة" value={stats.read.toLocaleString("en-US")} helper="تم تسجيل القراءة" icon={Eye} tone="green" />
        <StatCard title="فاشلة" value={stats.failed.toLocaleString("en-US")} helper="تحتاج مراجعة أو إعادة محاولة" icon={XCircle} tone="red" />
      </section>

      <section className="rounded-[12px] border border-[#E2DEF3] bg-[#F8F7FF] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <MessageCircle className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#675CBA]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#665D98]">حالة واتساب لا تُرقّى إلى "مرسل" بمجرد فتح المحادثة</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#827AA8]">إعادة المحاولة تفتح واتساب وتزيد عداد المحاولات فقط. التأكيد الحقيقي للتسليم يحتاج تكامل WhatsApp API أو Webhook.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="grid grid-cols-1 gap-[7px] border-b border-[#EDF0F3] p-[11px] xl:grid-cols-[minmax(0,1fr)_170px_170px_170px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="العنوان، العميل أو رقم الهاتف..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">قيد الإرسال</SelectItem>
              <SelectItem value="sent">مرسل</SelectItem>
              <SelectItem value="read">مقروء</SelectItem>
              <SelectItem value="failed">فشل</SelectItem>
            </SelectContent>
          </Select>

          <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as ChannelFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل القنوات</SelectItem>
              <SelectItem value="inapp">داخل المتجر</SelectItem>
              <SelectItem value="whatsapp">واتساب</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="oldest">الأقدم</SelectItem>
              <SelectItem value="attempts_high">الأكثر محاولات</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-[6px]">
            {hasFilters && <button type="button" onClick={clearFilters} className="flex h-[40px] w-[40px] items-center justify-center rounded-[9px] border border-[#E3E7EC] bg-white text-[#7E8690]"><CircleOff className="h-[11px] w-[11px]" /></button>}
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={isFetching} className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-white px-3 text-[10.5px] font-semibold text-[#68717B] shadow-none">{isFetching ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <RefreshCw className="ml-[5px] h-[11px] w-[11px]" />}تحديث</Button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[9px]">
          <p className="text-[10.5px] font-semibold text-[#59616B]">{filtered.length.toLocaleString("ar-EG")} سجل ظاهر</p>
          {isFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
        </div>

        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10px] font-semibold text-[#858D97]">
                    <th className="px-[12px] text-right">الإشعار</th>
                    <th className="px-[12px] text-right">العميل</th>
                    <th className="px-[12px] text-right">القناة</th>
                    <th className="px-[12px] text-right">الحالة</th>
                    <th className="px-[12px] text-right">المحاولات</th>
                    <th className="px-[12px] text-right">آخر خطأ</th>
                    <th className="px-[12px] text-right">التاريخ</th>
                    <th className="w-[140px] px-[12px] text-center">الإجراء</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                      <td className="max-w-[320px] px-[12px] py-[11px]"><p className="truncate text-[10.5px] font-semibold text-[#4A525C]">{row.notif_title}</p><p className="mt-[3px] line-clamp-1 text-[9.5px] text-[#9299A3]">{row.notif_body || "—"}</p></td>
                      <td className="px-[12px] py-[11px]"><p className="text-[10.5px] font-semibold text-[#59616B]">{row.customer_name}</p><p dir="ltr" className="mt-[2px] text-right text-[9.5px] text-[#9AA2AC]">{row.customer_phone || (row.broadcast ? "Broadcast" : "—")}</p></td>
                      <td className="px-[12px] py-[11px]"><ChannelBadge channel={row.channel} /></td>
                      <td className="px-[12px] py-[11px]"><StatusBadge status={row.status} /></td>
                      <td className="px-[12px] py-[11px]"><span className="inline-flex min-w-[30px] justify-center rounded-[7px] bg-[#F4F6F8] px-[7px] py-[4px] text-[10px] font-semibold text-[#69727C]">{row.attempts}</span></td>
                      <td className="max-w-[220px] px-[12px] py-[11px]"><p title={row.last_error || ""} className={cn("truncate text-[9.5px]", row.last_error ? "text-[#C15F56]" : "text-[#A0A6AF]")}>{row.last_error || "—"}</p></td>
                      <td className="px-[12px] py-[11px]"><p className="whitespace-nowrap text-[9.5px] text-[#7E8690]">{formatDateTime(row.created_at)}</p>{row.read_at && <p className="mt-[2px] whitespace-nowrap text-[8.5px] text-[#6F967A]">قُرئ {formatDateTime(row.read_at)}</p>}</td>
                      <td className="px-[12px] py-[11px] text-center">
                        {row.channel === "whatsapp" && row.status !== "sent" && row.status !== "read" ? (
                          <Button type="button" variant="outline" size="sm" disabled={retryingId === row.id} onClick={() => void retryWhatsApp(row)} className="h-[32px] rounded-[8px] border-[#D8E8DD] bg-white px-[9px] text-[9.5px] font-semibold text-[#5C8A68] shadow-none">{retryingId === row.id ? <Loader2 className="ml-[4px] h-[9px] w-[9px] animate-spin" /> : <RotateCw className="ml-[4px] h-[9px] w-[9px]" />}{row.status === "failed" ? "إعادة فتح" : "فتح واتساب"}</Button>
                        ) : (
                          <span className="text-[9px] text-[#B0B6BD]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-[8px] p-[8px] md:hidden">
              {filtered.map((row) => (
                <article key={row.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
                  <div className="p-[10px]">
                    <div className="flex items-start justify-between gap-[8px]">
                      <div className="min-w-0"><p className="truncate text-[10.5px] font-semibold text-[#4A525C]">{row.notif_title}</p><p className="mt-[3px] line-clamp-2 text-[9.5px] leading-5 text-[#8D959F]">{row.notif_body || "—"}</p></div>
                      <StatusBadge status={row.status} />
                    </div>

                    <div className="mt-[8px] flex flex-wrap gap-[5px]"><ChannelBadge channel={row.channel} /><span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#E4E7EB] bg-[#F7F8FA] px-[7px] text-[9px] font-semibold text-[#7E8690]">{row.attempts} محاولة</span></div>

                    <div className="mt-[9px] grid grid-cols-2 gap-[6px]">
                      <InfoBox label="العميل" value={row.customer_name} />
                      <InfoBox label="الهاتف" value={row.customer_phone || "—"} ltr />
                    </div>

                    {row.last_error && <div className="mt-[6px] rounded-[8px] border border-[#F0D7D4] bg-[#FFF6F5] px-[8px] py-[7px]"><p className="text-[9px] text-[#A85851]">آخر خطأ</p><p className="mt-[3px] text-[9.5px] leading-5 text-[#BD655D]">{row.last_error}</p></div>}

                    <p className="mt-[8px] text-[9px] text-[#9AA2AC]">{formatDateTime(row.created_at)}</p>
                  </div>

                  {row.channel === "whatsapp" && row.status !== "sent" && row.status !== "read" && (
                    <div className="border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                      <Button type="button" variant="outline" disabled={retryingId === row.id} onClick={() => void retryWhatsApp(row)} className="h-[35px] w-full rounded-[8px] border-[#D8E8DD] bg-white text-[10px] font-semibold text-[#5C8A68] shadow-none">{retryingId === row.id ? <Loader2 className="ml-[5px] h-[10px] w-[10px] animate-spin" /> : <MessageCircle className="ml-[5px] h-[10px] w-[10px]" />}{row.status === "failed" ? "إعادة فتح واتساب" : "فتح واتساب"}</Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "blue" | "green" | "red" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    red: { icon: "bg-[#FFF0F0] text-[#C76161]", line: "bg-[#C76161]" },
  }[tone];

  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const StatusBadge = ({ status }: { status: DeliveryStatus }) => {
  const config: Record<DeliveryStatus, { label: string; icon: LucideIcon; className: string }> = {
    pending: { label: "قيد الإرسال", icon: Clock3, className: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]" },
    sent: { label: "مرسل", icon: CheckCircle2, className: "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]" },
    failed: { label: "فشل", icon: XCircle, className: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]" },
    read: { label: "مقروء", icon: Eye, className: "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" },
  };

  const current = config[status] || config.pending;
  const Icon = current.icon;

  return <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[9px] font-semibold", current.className)}><Icon className="h-[9px] w-[9px]" />{current.label}</span>;
};

const ChannelBadge = ({ channel }: { channel: DeliveryChannel }) => {
  if (channel === "whatsapp") return <span className="inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[8px] text-[9px] font-semibold text-[#568468]"><MessageCircle className="h-[9px] w-[9px]" />واتساب</span>;
  return <span className="inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border border-[#E2DEF3] bg-[#F8F7FF] px-[8px] text-[9px] font-semibold text-[#675CBA]"><Bell className="h-[9px] w-[9px]" />داخل المتجر</span>;
};

const InfoBox = ({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) => <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[9px] text-[#9AA2AC]">{label}</p><p dir={ltr ? "ltr" : "rtl"} className={cn("mt-[3px] truncate text-[10px] font-semibold text-[#59616B]", ltr && "text-right")}>{value}</p></div>;

const EmptyState = () => <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F1EFFF] text-[#675CBA]"><Activity className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11.5px] font-semibold text-[#535B65]">لا توجد سجلات مطابقة</h3><p className="mt-[5px] text-[10px] text-[#9BA2AC]">غيّر الفلاتر أو انتظر وصول محاولات تسليم جديدة.</p></div>;

const normalizeWhatsappPhone = (phone: string) => {
  let value = String(phone || "").replace(/\D/g, "");

  if (value.startsWith("00")) value = value.slice(2);
  if (value.startsWith("0")) value = value.slice(1);

  return value;
};

const buildWhatsAppMessage = (row: DeliveryView) => {
  const payloadLink = typeof row.payload?.link === "string" ? row.payload.link.trim() : "";
  return `${row.notif_title}\n\n${row.notif_body}${payloadLink ? `\n\n${payloadLink}` : ""}`.trim();
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "—";
  }
};

export default AdminNotificationDeliveriesPage;