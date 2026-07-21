import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Send, MessageCircle, Users, Trash2, Loader2, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface CustomerLite {
  id: string;
  name: string;
  phone: string;
  country: string;
}

interface NotifRow {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  broadcast: boolean;
  customer_id: string | null;
  created_at: string;
  is_read: boolean;
}

const AdminCustomerNotificationsPage = () => {
  const [params] = useSearchParams();
  const preselectedId = params.get("customerId") || "";

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [recent, setRecent] = useState<NotifRow[]>([]);
  const [target, setTarget] = useState<"single" | "broadcast">(preselectedId ? "single" : "broadcast");
  const [customerId, setCustomerId] = useState(preselectedId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [link, setLink] = useState("");
  const [alsoWhatsapp, setAlsoWhatsapp] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("customers").select("id, name, phone, country").order("created_at", { ascending: false }).limit(500);
      setCustomers((data || []) as CustomerLite[]);
    })();
    loadRecent();
  }, []);

  const loadRecent = async () => {
    const { data } = await (supabase as any)
      .from("customer_notifications")
      .select("id,title,message,type,link,broadcast,customer_id,created_at,is_read")
      .order("created_at", { ascending: false })
      .limit(30);
    setRecent((data || []) as NotifRow[]);
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const openWhatsApp = (phone: string, msg: string) => {
    let p = String(phone || "").replace(/\D/g, "");
    if (p.startsWith("0")) p = p.substring(1);
    if (!p) return;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("الرجاء إدخال العنوان والمحتوى");
      return;
    }
    if (target === "single" && !customerId) {
      toast.error("اختر عميلاً");
      return;
    }

    setSending(true);
    try {
      let rows: any[] = [];
      if (target === "broadcast") {
        rows = [{
          title: title.trim(),
          message: body.trim(),
          type,
          link: link.trim() || null,
          broadcast: true,
          customer_id: null,
          user_id: null,
          customer_phone: null,
        }];
      } else if (selectedCustomer) {
        rows = [{
          title: title.trim(),
          message: body.trim(),
          type,
          link: link.trim() || null,
          broadcast: false,
          customer_id: selectedCustomer.id,
          customer_phone: selectedCustomer.phone,
          country: selectedCustomer.country,
        }];
      }

      const { data: inserted, error } = await (supabase as any)
        .from("customer_notifications")
        .insert(rows)
        .select("id");
      if (error) throw error;
      const notifId = inserted?.[0]?.id;
      toast.success("تم إرسال الإشعار");

      // Track delivery: in-app row
      if (notifId) {
        const deliveryRows: any[] = [];
        deliveryRows.push({
          notification_id: notifId,
          customer_id: target === "single" ? selectedCustomer?.id || null : null,
          customer_phone: target === "single" ? selectedCustomer?.phone || null : null,
          channel: "inapp",
          status: "sent",
          attempts: 1,
          delivered_at: new Date().toISOString(),
          payload: { title: title.trim(), body: body.trim(), broadcast: target === "broadcast" },
        });

        // WhatsApp delivery row (if applicable)
        if (alsoWhatsapp && selectedCustomer && target === "single") {
          let waStatus: "sent" | "failed" = "sent";
          let waError: string | null = null;
          try {
            openWhatsApp(selectedCustomer.phone, `${title.trim()}\n\n${body.trim()}${link ? `\n\n${link}` : ""}`);
          } catch (e: any) {
            waStatus = "failed";
            waError = String(e?.message || e);
          }
          deliveryRows.push({
            notification_id: notifId,
            customer_id: selectedCustomer.id,
            customer_phone: selectedCustomer.phone,
            channel: "whatsapp",
            status: waStatus,
            attempts: 1,
            last_error: waError,
            delivered_at: waStatus === "sent" ? new Date().toISOString() : null,
            payload: { title: title.trim(), body: body.trim() },
          });
        }

        await (supabase as any).from("notification_deliveries").insert(deliveryRows);
      }

      setTitle("");
      setBody("");
      setLink("");
      loadRecent();
    } catch (err: any) {
      toast.error("فشل الإرسال: " + (err?.message || ""));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("customer_notifications").delete().eq("id", id);
    if (error) toast.error("فشل الحذف");
    else {
      toast.success("تم الحذف");
      loadRecent();
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="التسويق والاتصال"
        title="إشعارات العملاء"
        description="أرسل إشعارات داخل التطبيق مع خيار الإرسال عبر واتساب"
      />

      <div className="flex justify-end">
        <Link to="/admin/notification-deliveries">
          <Button variant="outline" className="gap-2">
            <Activity className="w-4 h-4" /> سجل تسليم الإشعارات
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-heading text-lg flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> إرسال إشعار جديد</h2>

          <div className="grid grid-cols-2 gap-2">
            <Button variant={target === "broadcast" ? "default" : "outline"} onClick={() => setTarget("broadcast")}>
              <Users className="w-4 h-4 ml-2" /> جميع العملاء
            </Button>
            <Button variant={target === "single" ? "default" : "outline"} onClick={() => setTarget("single")}>
              <Bell className="w-4 h-4 ml-2" /> عميل محدد
            </Button>
          </div>

          {target === "single" && (
            <div>
              <Label>العميل</Label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— اختر عميلاً —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>عنوان الإشعار</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تخفيض حصري 20%" className="mt-1" />
          </div>

          <div>
            <Label>المحتوى</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="اكتب نص الإشعار..." className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>النوع</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 text-sm">
                <option value="info">معلومات</option>
                <option value="order">طلب</option>
                <option value="promo">عرض / تخفيض</option>
                <option value="system">نظام</option>
              </select>
            </div>
            <div>
              <Label>رابط (اختياري)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/products/..." className="mt-1" />
            </div>
          </div>

          {target === "single" && selectedCustomer && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={alsoWhatsapp} onChange={(e) => setAlsoWhatsapp(e.target.checked)} />
              إرسال نسخة عبر واتساب أيضاً ({selectedCustomer.phone})
            </label>
          )}

          <Button onClick={handleSend} disabled={sending} className="w-full">
            {sending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
            إرسال الإشعار
          </Button>

          {selectedCustomer && target === "single" && (
            <Button
              variant="outline"
              onClick={() => openWhatsApp(selectedCustomer.phone, `${title}\n\n${body}`)}
              className="w-full text-green-700 border-green-500/40"
            >
              <MessageCircle className="w-4 h-4 ml-2" /> فتح محادثة واتساب مباشرة
            </Button>
          )}
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-heading text-lg mb-3">آخر الإشعارات المُرسلة</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {recent.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">لا توجد إشعارات بعد</p>}
            {recent.map((n) => (
              <div key={n.id} className="border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {n.broadcast ? "بث عام" : "مخصص"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerNotificationsPage;