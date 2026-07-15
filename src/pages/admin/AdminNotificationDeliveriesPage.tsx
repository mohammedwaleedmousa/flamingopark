import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, MessageCircle, CheckCircle2, XCircle, Clock, Eye, RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface DeliveryRow {
  id: string;
  notification_id: string;
  customer_id: string | null;
  customer_phone: string | null;
  channel: "inapp" | "whatsapp";
  status: "pending" | "sent" | "failed" | "read";
  attempts: number;
  last_error: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  payload: any;
  notif_title?: string;
  notif_body?: string;
  customer_name?: string;
}

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: "قيد الإرسال", icon: Clock, cls: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" },
  sent: { label: "مرسل", icon: CheckCircle2, cls: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  failed: { label: "فشل", icon: XCircle, cls: "bg-destructive/10 text-destructive border-destructive/30" },
  read: { label: "مقروء", icon: Eye, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
};

const AdminNotificationDeliveriesPage = () => {
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: deliveries, error } = await (supabase as any)
        .from("notification_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      const list = (deliveries || []) as DeliveryRow[];
      const notifIds = Array.from(new Set(list.map((r) => r.notification_id).filter(Boolean)));
      const custIds = Array.from(new Set(list.map((r) => r.customer_id).filter(Boolean))) as string[];

      const [{ data: notifs }, { data: custs }] = await Promise.all([
        notifIds.length
          ? (supabase as any).from("customer_notifications").select("id,title,body").in("id", notifIds)
          : Promise.resolve({ data: [] }),
        custIds.length
          ? supabase.from("customers").select("id,name").in("id", custIds)
          : Promise.resolve({ data: [] }),
      ]);

      const nMap = new Map((notifs || []).map((n: any) => [n.id, n]));
      const cMap = new Map((custs || []).map((c: any) => [c.id, c]));

      setRows(
        list.map((r) => ({
          ...r,
          notif_title: nMap.get(r.notification_id)?.title,
          notif_body: nMap.get(r.notification_id)?.body,
          customer_name: r.customer_id ? cMap.get(r.customer_id)?.name : "بث عام",
        }))
      );
    } catch (e: any) {
      toast.error("فشل تحميل السجلات: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const channel = (supabase as any)
      .channel("notif-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_deliveries" }, () => load())
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (channelFilter !== "all" && r.channel !== channelFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          (r.notif_title || "").toLowerCase().includes(q) ||
          (r.customer_name || "").toLowerCase().includes(q) ||
          (r.customer_phone || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, statusFilter, channelFilter, search]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      sent: rows.filter((r) => r.status === "sent").length,
      failed: rows.filter((r) => r.status === "failed").length,
      read: rows.filter((r) => r.status === "read").length,
    };
  }, [rows]);

  const retryWhatsApp = async (row: DeliveryRow) => {
    if (row.channel !== "whatsapp") return;
    if (!row.customer_phone) {
      toast.error("لا يوجد رقم هاتف");
      return;
    }
    setRetryingId(row.id);
    try {
      let phone = row.customer_phone.replace(/\D/g, "");
      if (phone.startsWith("0")) phone = phone.substring(1);
      const msg = `${row.notif_title || ""}\n\n${row.notif_body || ""}`.trim();
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
      const { error } = await (supabase as any)
        .from("notification_deliveries")
        .update({ status: "sent", attempts: row.attempts + 1, delivered_at: new Date().toISOString(), last_error: null })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("تم فتح واتساب وتسجيل المحاولة");
      load();
    } catch (e: any) {
      await (supabase as any)
        .from("notification_deliveries")
        .update({ status: "failed", attempts: row.attempts + 1, last_error: String(e?.message || e) })
        .eq("id", row.id);
      toast.error("فشلت المحاولة");
      load();
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="التسويق والاتصال"
        title="سجل تسليم الإشعارات"
        description="تتبع حالة كل إشعار داخل التطبيق وعبر واتساب مع سجل المحاولات"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "الإجمالي", value: stats.total, cls: "bg-muted" },
          { label: "مرسل", value: stats.sent, cls: "bg-blue-500/10 text-blue-700" },
          { label: "مقروء", value: stats.read, cls: "bg-emerald-500/10 text-emerald-700" },
          { label: "فشل", value: stats.failed, cls: "bg-destructive/10 text-destructive" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl p-4 border border-border ${k.cls}`}>
            <p className="text-xs opacity-80">{k.label}</p>
            <p className="text-2xl font-heading mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالعنوان / اسم عميل / هاتف"
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">قيد الإرسال</option>
          <option value="sent">مرسل</option>
          <option value="read">مقروء</option>
          <option value="failed">فشل</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">كل القنوات</option>
          <option value="inapp">داخل التطبيق</option>
          <option value="whatsapp">واتساب</option>
        </select>
        <Button variant="outline" onClick={load} className="gap-2">
          <RotateCw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> جارٍ التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">لا توجد سجلات مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="text-right px-3 py-3">الإشعار</th>
                  <th className="text-right px-3 py-3">العميل</th>
                  <th className="text-right px-3 py-3">القناة</th>
                  <th className="text-right px-3 py-3">الحالة</th>
                  <th className="text-right px-3 py-3">المحاولات</th>
                  <th className="text-right px-3 py-3">آخر خطأ</th>
                  <th className="text-right px-3 py-3">التاريخ</th>
                  <th className="text-right px-3 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const s = statusConfig[r.status] || statusConfig.pending;
                  const Icon = s.icon;
                  const ChIcon = r.channel === "whatsapp" ? MessageCircle : Bell;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition">
                      <td className="px-3 py-3">
                        <p className="font-medium truncate max-w-[220px]">{r.notif_title || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">{r.notif_body}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p>{r.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{r.customer_phone || ""}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted">
                          <ChIcon className="w-3 h-3" />
                          {r.channel === "whatsapp" ? "واتساب" : "داخلي"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${s.cls}`}>
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">{r.attempts}</td>
                      <td className="px-3 py-3 text-xs text-destructive max-w-[180px] truncate" title={r.last_error || ""}>
                        {r.last_error || "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-3 py-3">
                        {r.channel === "whatsapp" && r.status !== "read" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-500/40 gap-1"
                            disabled={retryingId === r.id}
                            onClick={() => retryWhatsApp(r)}
                          >
                            {retryingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                            إعادة المحاولة
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationDeliveriesPage;