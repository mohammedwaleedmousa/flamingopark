import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Activity, Bell, CheckCircle2, CircleOff, ExternalLink, Loader2, MessageCircle, Send, Search, Trash2, Users, type LucideIcon } from "lucide-react";

type NotificationTarget = "broadcast" | "single";
type NotificationType = "info" | "order" | "promo" | "system";

interface CustomerLite {
  id: string;
  name: string;
  phone: string;
  country: string | null;
  region: string | null;
  created_at: string;
}

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  body: string | null;
  type: NotificationType;
  link: string | null;
  broadcast: boolean;
  customer_id: string | null;
  customer_phone: string | null;
  created_at: string;
  is_read: boolean | null;
}

interface DeliveryRow {
  id: string;
  notification_id: string;
  channel: "inapp" | "whatsapp";
  status: "pending" | "sent" | "failed" | "read";
  created_at: string;
}

interface ComposeForm {
  target: NotificationTarget;
  customerId: string;
  title: string;
  body: string;
  type: NotificationType;
  link: string;
  alsoWhatsapp: boolean;
}

const emptyForm = (preselectedId = ""): ComposeForm => ({
  target: preselectedId ? "single" : "broadcast",
  customerId: preselectedId,
  title: "",
  body: "",
  type: "info",
  link: "",
  alsoWhatsapp: false,
});

const AdminCustomerNotificationsPage = () => {
  const [params] = useSearchParams();
  const preselectedId = params.get("customerId") || "";
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ComposeForm>(() => emptyForm(preselectedId));
  const [customerSearch, setCustomerSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null);

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["admin-notification-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name,phone,country,region,created_at").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as CustomerLite[];
    },
    staleTime: 60_000,
  });

  const { data: recent = [], isLoading: recentLoading, isFetching: recentFetching } = useQuery({
    queryKey: ["admin-customer-notifications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customer_notifications").select("id,title,message,body,type,link,broadcast,customer_id,customer_phone,created_at,is_read").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        type: ["info", "order", "promo", "system"].includes(row.type) ? row.type : "info",
      })) as NotificationRow[];
    },
    staleTime: 15_000,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["admin-notification-deliveries-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("notification_deliveries").select("id,notification_id,channel,status,created_at").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as DeliveryRow[];
    },
    staleTime: 15_000,
  });

  const selectedCustomer = useMemo(() => customers.find((customer) => customer.id === form.customerId) || null, [customers, form.customerId]);

  const customerOptions = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) return customers.slice(0, 80);

    return customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.region || ""}`.toLowerCase().includes(query)).slice(0, 80);
  }, [customers, customerSearch]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    if (!query) return recent;

    return recent.filter((notification) => `${notification.title} ${notification.message} ${notification.customer_phone || ""}`.toLowerCase().includes(query));
  }, [recent, historySearch]);

  const deliveryMap = useMemo(() => {
    const map = new Map<string, DeliveryRow[]>();

    deliveries.forEach((delivery) => {
      const list = map.get(delivery.notification_id) || [];
      list.push(delivery);
      map.set(delivery.notification_id, list);
    });

    return map;
  }, [deliveries]);

  const stats = useMemo(() => {
    const broadcast = recent.filter((notification) => notification.broadcast).length;
    const targeted = recent.filter((notification) => !notification.broadcast).length;
    const whatsappPending = deliveries.filter((delivery) => delivery.channel === "whatsapp" && delivery.status === "pending").length;

    return {
      total: recent.length,
      broadcast,
      targeted,
      whatsappPending,
    };
  }, [recent, deliveries]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const title = form.title.trim();
      const body = form.body.trim();
      const link = form.link.trim();

      if (!title || !body) throw new Error("العنوان ومحتوى الإشعار مطلوبان.");
      if (form.target === "single" && !selectedCustomer) throw new Error("اختر العميل المستهدف.");
      if (link && !isSafeLink(link)) throw new Error("الرابط يجب أن يكون رابطًا داخليًا يبدأ بـ / أو رابط HTTPS صحيحًا.");

      const payload = form.target === "broadcast"
        ? {
            title,
            message: body,
            body,
            type: form.type,
            link: link || null,
            broadcast: true,
            customer_id: null,
            user_id: null,
            customer_phone: null,
            country: null,
          }
        : {
            title,
            message: body,
            body,
            type: form.type,
            link: link || null,
            broadcast: false,
            customer_id: selectedCustomer!.id,
            user_id: null,
            customer_phone: selectedCustomer!.phone,
            country: selectedCustomer!.country,
          };

      const { data: inserted, error } = await (supabase as any).from("customer_notifications").insert(payload).select("id").single();
      if (error) throw error;

      const notificationId = String(inserted.id);
      const deliveryRows: any[] = [];

      deliveryRows.push({
        notification_id: notificationId,
        customer_id: form.target === "single" ? selectedCustomer?.id || null : null,
        customer_phone: form.target === "single" ? selectedCustomer?.phone || null : null,
        channel: "inapp",
        status: form.target === "broadcast" ? "sent" : "pending",
        attempts: 1,
        delivered_at: form.target === "broadcast" ? new Date().toISOString() : null,
        payload: { title, body, broadcast: form.target === "broadcast", link: link || null },
      });

      if (form.alsoWhatsapp && form.target === "single" && selectedCustomer) {
        deliveryRows.push({
          notification_id: notificationId,
          customer_id: selectedCustomer.id,
          customer_phone: selectedCustomer.phone,
          channel: "whatsapp",
          status: "pending",
          attempts: 0,
          delivered_at: null,
          payload: { title, body, link: link || null },
        });
      }

      const { error: deliveryError } = await (supabase as any).from("notification_deliveries").insert(deliveryRows);
      if (deliveryError) throw deliveryError;

      return {
        notificationId,
        shouldOpenWhatsapp: form.alsoWhatsapp && form.target === "single" && Boolean(selectedCustomer),
        whatsappMessage: selectedCustomer ? buildWhatsappMessage(title, body, link) : "",
        phone: selectedCustomer?.phone || "",
      };
    },
    onSuccess: async (result) => {
      if (result.shouldOpenWhatsapp) openWhatsApp(result.phone, result.whatsappMessage);

      setForm(emptyForm(""));
      setCustomerSearch("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-customer-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-notification-deliveries-summary"] }),
      ]);

      toast({ title: "تم إنشاء الإشعار", description: result.shouldOpenWhatsapp ? "تم فتح واتساب، وتبقى حالته معلّقة حتى يتم الإرسال يدويًا." : "تم حفظ الإشعار بنجاح." });
    },
    onError: (error: any) => {
      toast({ title: "تعذر إرسال الإشعار", description: error?.message || "حدث خطأ غير متوقع.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notification: NotificationRow) => {
      const { error } = await (supabase as any).from("customer_notifications").delete().eq("id", notification.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteTarget(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-customer-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-notification-deliveries-summary"] }),
      ]);

      toast({ title: "تم حذف الإشعار" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف الإشعار", description: error?.message || "حدث خطأ.", variant: "destructive" });
    },
  });

  const previewType = notificationTypeLabel(form.type);

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التسويق والاتصال" title="إشعارات العملاء" description="إرسال إشعارات داخل المتجر ومتابعة قنوات التسليم" actions={[{ label: "سجل التسليم", icon: Activity, href: "/admin/notification-deliveries", variant: "outline" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي الإشعارات" value={stats.total.toLocaleString("en-US")} helper="آخر الإشعارات المسجلة" icon={Bell} tone="indigo" />
        <StatCard title="البث العام" value={stats.broadcast.toLocaleString("en-US")} helper="موجه لجميع العملاء" icon={Users} tone="green" />
        <StatCard title="الإشعارات المخصصة" value={stats.targeted.toLocaleString("en-US")} helper="موجهة لعميل محدد" icon={Send} tone="blue" />
        <StatCard title="واتساب معلّق" value={stats.whatsappPending.toLocaleString("en-US")} helper="يتطلب إرسالًا يدويًا" icon={MessageCircle} tone="amber" />
      </section>

      <section className="rounded-[12px] border border-[#E2DEF3] bg-[#F8F7FF] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <MessageCircle className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#675CBA]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#665D98]">واتساب قناة يدوية حاليًا</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#827AA8]">فتح محادثة واتساب لا يثبت التسليم، لذلك يتم تسجيلها كـ "معلّق" بدل اعتبارها مرسلة تلقائيًا.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
          <div className="flex items-center gap-[8px] border-b border-[#EDF0F3] px-[13px] py-[11px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><Send className="h-[12px] w-[12px]" /></div>
            <div><h2 className="text-[11.5px] font-semibold text-[#4A525C]">إنشاء إشعار جديد</h2><p className="mt-[2px] text-[9.5px] text-[#9AA2AC]">اختر الجمهور ثم اكتب محتوى الإشعار.</p></div>
          </div>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); sendMutation.mutate(); }} className="space-y-[10px] p-[11px]">
            <FormSection title="الجمهور" icon={Users}>
              <div className="grid grid-cols-2 gap-[6px]">
                <button type="button" onClick={() => setForm((current) => ({ ...current, target: "broadcast", customerId: "", alsoWhatsapp: false }))} className={cn("flex min-h-[62px] items-center justify-center gap-[7px] rounded-[10px] border text-[10.5px] font-semibold transition-colors", form.target === "broadcast" ? "border-[#CBC5E7] bg-[#F5F3FF] text-[#675CBA]" : "border-[#E4E8ED] bg-[#FAFBFC] text-[#727A84]")}><Users className="h-[12px] w-[12px]" />جميع العملاء</button>
                <button type="button" onClick={() => setForm((current) => ({ ...current, target: "single" }))} className={cn("flex min-h-[62px] items-center justify-center gap-[7px] rounded-[10px] border text-[10.5px] font-semibold transition-colors", form.target === "single" ? "border-[#CBC5E7] bg-[#F5F3FF] text-[#675CBA]" : "border-[#E4E8ED] bg-[#FAFBFC] text-[#727A84]")}><Bell className="h-[12px] w-[12px]" />عميل محدد</button>
              </div>

              {form.target === "single" && (
                <div className="space-y-[7px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#969EA8]" />
                    <Input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو المنطقة..." className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] pr-[34px] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </div>

                  <div className="max-h-[220px] overflow-y-auto rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[5px]">
                    {customersLoading ? <div className="flex h-[90px] items-center justify-center"><Loader2 className="h-[14px] w-[14px] animate-spin text-[#675CBA]" /></div> : customerOptions.length === 0 ? <p className="py-8 text-center text-[10px] text-[#9AA2AC]">لا يوجد عملاء مطابقون.</p> : customerOptions.map((customer) => {
                      const selected = form.customerId === customer.id;

                      return <button type="button" key={customer.id} onClick={() => setForm((current) => ({ ...current, customerId: customer.id }))} className={cn("flex w-full items-center gap-[8px] rounded-[8px] border p-[7px] text-right transition-colors", selected ? "border-[#CBC5E7] bg-[#F5F3FF]" : "border-transparent bg-white hover:border-[#E1E5EA]")}><div className={cn("flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[9px] text-[10px] font-semibold", selected ? "bg-[#675CBA] text-white" : "bg-[#EEF1F4] text-[#7E8690]")}>{customer.name?.trim()?.charAt(0) || "ع"}</div><div className="min-w-0 flex-1"><p className={cn("truncate text-[10.5px] font-semibold", selected ? "text-[#675CBA]" : "text-[#555D67]")}>{customer.name}</p><p dir="ltr" className="mt-[2px] text-right text-[9.5px] text-[#9AA2AC]">{customer.phone}</p></div>{selected && <CheckCircle2 className="h-[12px] w-[12px] shrink-0 text-[#675CBA]" />}</button>;
                    })}
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection title="المحتوى" icon={Bell}>
              <Field label="عنوان الإشعار" required><Input value={form.title} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="مثال: وصل جديد فلامنجو" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /><Count value={form.title.length} max={120} /></Field>
              <Field label="نص الإشعار" required><Textarea value={form.body} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows={5} placeholder="اكتب رسالة قصيرة وواضحة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /><Count value={form.body.length} max={500} /></Field>

              <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                <Field label="نوع الإشعار">
                  <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as NotificationType }))}>
                    <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="info">معلومات</SelectItem><SelectItem value="order">طلب</SelectItem><SelectItem value="promo">عرض / تخفيض</SelectItem><SelectItem value="system">نظام</SelectItem></SelectContent>
                  </Select>
                </Field>

                <Field label="رابط اختياري"><Input value={form.link} onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))} placeholder="/products أو https://..." dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
              </div>
            </FormSection>

            {form.target === "single" && selectedCustomer && (
              <FormSection title="قنوات الإرسال" icon={MessageCircle}>
                <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
                  <div><p className="text-[10.5px] font-semibold text-[#555D67]">فتح واتساب بعد الحفظ</p><p dir="ltr" className="mt-[3px] text-right text-[9.5px] text-[#9BA2AC]">{selectedCustomer.phone}</p></div>
                  <Switch checked={form.alsoWhatsapp} onCheckedChange={(checked) => setForm((current) => ({ ...current, alsoWhatsapp: checked }))} />
                </div>
              </FormSection>
            )}

            <div className="flex justify-end border-t border-[#EDF0F3] pt-[10px]">
              <Button type="submit" disabled={sendMutation.isPending} className="h-[40px] min-w-[150px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{sendMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <Send className="ml-[5px] h-[12px] w-[12px]" />}إرسال الإشعار</Button>
            </div>
          </form>
        </section>

        <div className="space-y-[10px]">
          <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]">
            <div className="mb-[10px] flex items-center gap-[7px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Bell className="h-[11px] w-[11px]" /></div><h3 className="text-[10.5px] font-semibold text-[#4A525C]">معاينة الإشعار</h3></div>

            <div className="rounded-[13px] border border-[#E7EAEF] bg-[#FAFBFC] p-[11px]">
              <div className="flex items-start gap-[9px]">
                <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-[#F1EFFF] text-[#675CBA]"><Bell className="h-[14px] w-[14px]" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-[6px]"><p className="truncate text-[11px] font-semibold text-[#454D57]">{form.title.trim() || "عنوان الإشعار"}</p><span className="shrink-0 rounded-[6px] bg-white px-[6px] py-[3px] text-[8.5px] font-semibold text-[#7E8690]">{previewType}</span></div>
                  <p className="mt-[5px] whitespace-pre-wrap text-[10px] leading-5 text-[#818A94]">{form.body.trim() || "سيظهر نص الإشعار هنا كما سيشاهده العميل."}</p>
                  {form.link.trim() && <div className="mt-[7px] inline-flex items-center gap-[4px] text-[9px] font-semibold text-[#675CBA]"><ExternalLink className="h-[8px] w-[8px]" />فتح الرابط</div>}
                </div>
              </div>
            </div>

            <div className="mt-[8px] grid grid-cols-2 gap-[6px]">
              <InfoBox label="الجمهور" value={form.target === "broadcast" ? "جميع العملاء" : selectedCustomer?.name || "لم يتم الاختيار"} />
              <InfoBox label="القناة" value={form.alsoWhatsapp ? "داخل المتجر + واتساب" : "داخل المتجر"} />
            </div>
          </section>

          {form.target === "single" && selectedCustomer && (
            <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]">
              <p className="text-[10px] text-[#9AA2AC]">العميل المحدد</p>
              <p className="mt-[4px] text-[11px] font-semibold text-[#4A525C]">{selectedCustomer.name}</p>
              <p dir="ltr" className="mt-[3px] text-right text-[10px] text-[#7E8690]">{selectedCustomer.phone}</p>
              <p className="mt-[3px] text-[9.5px] text-[#9AA2AC]">{selectedCustomer.region || selectedCustomer.country || "—"}</p>
              <Button type="button" variant="outline" onClick={() => openWhatsApp(selectedCustomer.phone, buildWhatsappMessage(form.title, form.body, form.link))} className="mt-[9px] h-[35px] w-full rounded-[8px] border-[#D9E9DD] bg-white text-[10px] font-semibold text-[#5C8A68] shadow-none"><MessageCircle className="ml-[5px] h-[10px] w-[10px]" />فتح واتساب</Button>
            </section>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex flex-col gap-[8px] border-b border-[#EDF0F3] p-[11px] sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-[11.5px] font-semibold text-[#4A525C]">آخر الإشعارات</h2><p className="mt-[2px] text-[9.5px] text-[#9AA2AC]">سجل الرسائل التي تم إنشاؤها من لوحة الإدارة.</p></div>
          <div className="flex items-center gap-[6px]">
            <div className="relative w-full sm:w-[260px]"><Search className="pointer-events-none absolute right-[10px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 text-[#969EA8]" /><Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="بحث في السجل..." className="h-[36px] rounded-[8px] border-[#E3E7EC] bg-[#F8FAFC] pr-[31px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></div>
            {recentFetching && <Loader2 className="h-[11px] w-[11px] animate-spin text-[#8E959F]" />}
          </div>
        </div>

        {recentLoading ? (
          <div className="flex min-h-[180px] items-center justify-center"><Loader2 className="h-[16px] w-[16px] animate-spin text-[#675CBA]" /></div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex min-h-[210px] flex-col items-center justify-center text-center"><Bell className="h-[20px] w-[20px] text-[#B0B6BD]" /><p className="mt-2 text-[10.5px] text-[#9199A3]">لا توجد إشعارات مطابقة.</p></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="h-[43px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10px] font-semibold text-[#858D97]">
                    <th className="px-[12px] text-right">الإشعار</th>
                    <th className="px-[12px] text-right">الجمهور</th>
                    <th className="px-[12px] text-right">النوع</th>
                    <th className="px-[12px] text-right">القنوات</th>
                    <th className="px-[12px] text-right">التاريخ</th>
                    <th className="w-[70px] px-[12px] text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((notification) => {
                    const rows = deliveryMap.get(notification.id) || [];
                    const hasWhatsapp = rows.some((row) => row.channel === "whatsapp");

                    return (
                      <tr key={notification.id} className="border-b border-[#F0F2F5] last:border-b-0 hover:bg-[#FCFDFE]">
                        <td className="max-w-[380px] px-[12px] py-[11px]"><p className="truncate text-[10.5px] font-semibold text-[#4A525C]">{notification.title}</p><p className="mt-[3px] line-clamp-1 text-[9.5px] text-[#9299A3]">{notification.message}</p></td>
                        <td className="px-[12px] py-[11px]"><AudienceBadge broadcast={notification.broadcast} /></td>
                        <td className="px-[12px] py-[11px]"><span className="text-[10px] text-[#68717B]">{notificationTypeLabel(notification.type)}</span></td>
                        <td className="px-[12px] py-[11px]"><div className="flex flex-wrap gap-[4px]"><ChannelBadge label="داخل المتجر" /><ChannelBadge label={hasWhatsapp ? "واتساب" : "—"} muted={!hasWhatsapp} /></div></td>
                        <td className="px-[12px] py-[11px]"><span className="text-[9.5px] text-[#7E8690]">{formatDateTime(notification.created_at)}</span></td>
                        <td className="px-[12px] py-[11px] text-center"><button type="button" onClick={() => setDeleteTarget(notification)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[10px] w-[10px]" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-[8px] p-[8px] md:hidden">
              {filteredHistory.map((notification) => {
                const rows = deliveryMap.get(notification.id) || [];
                const hasWhatsapp = rows.some((row) => row.channel === "whatsapp");

                return (
                  <article key={notification.id} className="rounded-[12px] border border-[#E5E9EF] bg-white p-[10px]">
                    <div className="flex items-start justify-between gap-[8px]"><div className="min-w-0"><p className="text-[10.5px] font-semibold text-[#4A525C]">{notification.title}</p><p className="mt-[4px] line-clamp-2 text-[9.5px] leading-5 text-[#8D959F]">{notification.message}</p></div><button type="button" onClick={() => setDeleteTarget(notification)} className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border border-[#F0D7D4] text-[#C15F56]"><Trash2 className="h-[10px] w-[10px]" /></button></div>
                    <div className="mt-[8px] flex flex-wrap gap-[5px]"><AudienceBadge broadcast={notification.broadcast} /><ChannelBadge label="داخل المتجر" />{hasWhatsapp && <ChannelBadge label="واتساب" />}</div>
                    <p className="mt-[8px] text-[9px] text-[#9AA2AC]">{formatDateTime(notification.created_at)}</p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف الإشعار</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف الإشعار وسجلات التسليم المرتبطة به نهائيًا.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "amber" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    amber: { icon: "bg-[#FFF7E8] text-[#A9782F]", line: "bg-[#C49446]" },
  }[tone];

  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => <section className="rounded-[13px] border border-[#E5E9EF] bg-white p-[11px]"><div className="mb-[9px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[10.5px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[8px]">{children}</div></section>;

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => <div><Label className="mb-[6px] block text-[10.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;

const Count = ({ value, max }: { value: number; max: number }) => <p dir="ltr" className="mt-[4px] text-right text-[9px] text-[#A0A6AF]">{value}/{max}</p>;

const InfoBox = ({ label, value }: { label: string; value: string }) => <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[9px] text-[#9AA2AC]">{label}</p><p className="mt-[3px] truncate text-[10px] font-semibold text-[#59616B]">{value}</p></div>;

const AudienceBadge = ({ broadcast }: { broadcast: boolean }) => <span className={cn("inline-flex h-[25px] items-center gap-[4px] rounded-[7px] border px-[7px] text-[9px] font-semibold", broadcast ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]")}>{broadcast ? <Users className="h-[8px] w-[8px]" /> : <Bell className="h-[8px] w-[8px]" />}{broadcast ? "بث عام" : "مخصص"}</span>;

const ChannelBadge = ({ label, muted = false }: { label: string; muted?: boolean }) => <span className={cn("inline-flex h-[24px] items-center rounded-[6px] border px-[6px] text-[8.5px] font-semibold", muted ? "border-[#E4E7EB] bg-[#F7F8FA] text-[#A0A6AF]" : "border-[#E2DEF3] bg-[#F8F7FF] text-[#675CBA]")}>{label}</span>;

const notificationTypeLabel = (type: NotificationType) => {
  if (type === "order") return "طلب";
  if (type === "promo") return "عرض";
  if (type === "system") return "نظام";
  return "معلومات";
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "—";
  }
};

const isSafeLink = (value: string) => {
  if (!value) return true;
  if (value.startsWith("/")) return true;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeWhatsappPhone = (phone: string) => {
  let value = String(phone || "").replace(/\D/g, "");
  if (value.startsWith("00")) value = value.slice(2);
  if (value.startsWith("0")) value = value.slice(1);
  return value;
};

const buildWhatsappMessage = (title: string, body: string, link: string) => `${title.trim() || "فلامنجو بارك"}\n\n${body.trim()}${link.trim() ? `\n\n${link.trim()}` : ""}`;

const openWhatsApp = (phone: string, message: string) => {
  const normalized = normalizeWhatsappPhone(phone);

  if (!normalized) {
    toast({ title: "رقم واتساب غير صالح", variant: "destructive" });
    return;
  }

  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
};

export default AdminCustomerNotificationsPage;