import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Loader2, MapPin, Package, Printer, RefreshCw, Search, ShoppingBag } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type OrderItem = {
  product_id?: string | null;
  product_name?: string | null;
  name?: string | null;
  quantity?: number | null;
  selected_size?: string | null;
  selected_color?: string | null;
  selected_accessories?: Array<{ name?: string; name_ar?: string }> | null;
};

type PreparationOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string | null;
  customer_region: string | null;
  country: string;
  status: string;
  items: OrderItem[] | unknown;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "كل طلبات التجهيز" },
  { value: "pending", label: "قيد الانتظار" },
  { value: "confirmed", label: "مؤكد" },
  { value: "processing", label: "قيد التجهيز" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
};

const itemsOf = (order: PreparationOrder): OrderItem[] => Array.isArray(order.items) ? order.items as OrderItem[] : [];
const quantityOf = (item: OrderItem) => Math.max(1, Number(item.quantity || 1));
const itemsCount = (order: PreparationOrder) => itemsOf(order).reduce((sum, item) => sum + quantityOf(item), 0);
const itemName = (item: OrderItem) => item.product_name || item.name || "منتج";

const ageLabel = (createdAt: string) => {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));
  if (hours < 1) return "أقل من ساعة";
  if (hours < 24) return `${hours} س`;
  const days = Math.floor(hours / 24);
  return `${days} يوم`;
};

const AdminOrderPreparationPage = () => {
  const [orders, setOrders] = useState<PreparationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [country, setCountry] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id,order_number,customer_name,customer_phone,customer_address,customer_city,customer_region,country,status,items,created_at")
        .in("status", ["pending", "confirmed", "processing"])
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      setOrders((data ?? []) as PreparationOrder[]);
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحميل قائمة التجهيز", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (country !== "all" && order.country !== country) return false;
      if (!q) return true;
      const itemText = itemsOf(order).map(itemName).join(" ");
      return [order.order_number, order.customer_name, order.customer_phone, order.customer_address, order.customer_city, order.customer_region, itemText]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [orders, search, status, country]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === "pending").length,
    confirmed: orders.filter((order) => order.status === "confirmed").length,
    processing: orders.filter((order) => order.status === "processing").length,
    pieces: orders.reduce((sum, order) => sum + itemsCount(order), 0),
  }), [orders]);

  const printList = () => window.print();

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="print:hidden">
        <AdminPageHeader
          category="الطلبات والعمليات"
          title="قائمة التجهيز اليومية"
          description="رتّب الطلبات النشطة حسب الأقدم، جهّز القطع، واطبع ورقة Picking / Packing موحدة."
          actions={[
            { label: "الطلبات", icon: ShoppingBag, href: "/admin/orders" },
            { label: "طباعة القائمة", icon: Printer, onClick: printList, variant: "primary" },
          ]}
        />
      </div>

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-5 print:hidden">
        <Stat label="كل المطلوب" value={stats.total} helper={`${stats.pieces} قطعة`} icon={ClipboardList} />
        <Stat label="قيد الانتظار" value={stats.pending} helper="لم يؤكد بعد" icon={CalendarDays} />
        <Stat label="مؤكد" value={stats.confirmed} helper="جاهز للتجهيز" icon={CheckCircle2} />
        <Stat label="قيد التجهيز" value={stats.processing} helper="بدأ العمل عليه" icon={Package} />
        <Stat label="إجمالي القطع" value={stats.pieces} helper="داخل الطلبات النشطة" icon={ShoppingBag} />
      </section>

      <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[10px] print:hidden">
        <div className="flex flex-col gap-[8px] lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#9AA2AC]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="رقم الطلب، العميل، الهاتف أو المنتج..." className="h-[40px] rounded-[10px] border-[#E4E8ED] bg-[#F8FAFC] pr-[36px] text-[10px] shadow-none focus-visible:ring-0" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-[40px] rounded-[10px] border-[#E4E8ED] bg-[#F8FAFC] text-[9px] shadow-none lg:w-[165px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-[40px] rounded-[10px] border-[#E4E8ED] bg-[#F8FAFC] text-[9px] shadow-none lg:w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدول</SelectItem>
              <SelectItem value="YE">اليمن</SelectItem>
              <SelectItem value="SA">السعودية</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} className="h-[40px] w-[40px] rounded-[10px] border-[#E4E8ED] shadow-none">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </section>

      <div className="hidden print:block">
        <div className="mb-5 border-b border-black pb-3">
          <h1 className="text-xl font-bold">Flamingo Park — قائمة تجهيز الطلبات</h1>
          <p className="mt-1 text-xs">تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}</p>
          <p className="mt-1 text-xs">عدد الطلبات: {visible.length} • عدد القطع: {visible.reduce((sum, order) => sum + itemsCount(order), 0)}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-56 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#675CBA]" /></div>
      ) : visible.length === 0 ? (
        <section className="grid min-h-56 place-items-center rounded-[16px] border border-[#E5E9EF] bg-white text-center print:hidden">
          <div><p className="text-[11px] font-semibold text-[#4B535E]">لا توجد طلبات تحتاج تجهيز</p><p className="mt-1 text-[8px] text-[#989FA9]">جرّب تغيير الفلاتر أو تحديث القائمة.</p></div>
        </section>
      ) : (
        <div className="space-y-[9px] print:space-y-4">
          {visible.map((order, index) => (
            <article key={order.id} className="overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white print:break-inside-avoid print:rounded-none print:border-black">
              <div className="flex flex-col gap-3 border-b border-[#EDF0F3] px-[13px] py-[11px] sm:flex-row sm:items-center sm:justify-between print:border-black print:px-2 print:py-2">
                <div className="flex items-center gap-[9px]">
                  <div className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[9px] bg-[#F1EFFF] px-2 text-[9px] font-bold text-[#675CBA] print:h-auto print:min-w-0 print:bg-transparent print:p-0 print:text-black">{index + 1}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-[6px]">
                      <strong dir="ltr" className="text-[10px] text-[#3F4650] print:text-sm print:text-black">#{order.order_number}</strong>
                      <span className="rounded-full bg-[#F3F4F6] px-[7px] py-[3px] text-[6.5px] font-semibold text-[#747C86] print:border print:border-black print:bg-transparent print:text-black">{STATUS_LABELS[order.status] || order.status}</span>
                    </div>
                    <p className="mt-[3px] text-[8px] text-[#69717C] print:text-xs print:text-black">{order.customer_name} • <span dir="ltr">{order.customer_phone}</span></p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-[6px] text-[7px] text-[#8F97A2] print:text-xs print:text-black">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(order.created_at).toLocaleString("ar-EG")}</span>
                  <span className="rounded-full bg-[#FFF6E7] px-2 py-1 text-[#A9782F] print:bg-transparent print:text-black">الانتظار: {ageLabel(order.created_at)}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{order.customer_region || order.customer_city || order.customer_address || order.country}</span>
                </div>
              </div>

              <div className="grid gap-[7px] p-[10px] md:grid-cols-2 print:grid-cols-2 print:gap-2 print:p-2">
                {itemsOf(order).map((item, itemIndex) => (
                  <div key={`${item.product_id || itemName(item)}-${itemIndex}`} className="flex items-start gap-[9px] rounded-[10px] border border-[#E8EBEF] bg-[#FAFBFC] p-[9px] print:rounded-none print:border-black print:bg-transparent print:p-2">
                    <span className="mt-[1px] flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[4px] border border-[#C8CDD4] bg-white print:h-4 print:w-4 print:rounded-none print:border-black" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[8.5px] font-semibold text-[#454D57] print:text-xs print:text-black">{itemName(item)}</p>
                        <span className="shrink-0 rounded-[6px] bg-[#F1EFFF] px-[6px] py-[3px] text-[7px] font-bold text-[#675CBA] print:border print:border-black print:bg-transparent print:text-black">× {quantityOf(item)}</span>
                      </div>
                      <div className="mt-[5px] flex flex-wrap gap-[5px] text-[6.5px] text-[#7C848E] print:text-[10px] print:text-black">
                        {item.selected_color ? <span>اللون: {item.selected_color}</span> : null}
                        {item.selected_size ? <span>المقاس: {item.selected_size}</span> : null}
                        {Array.isArray(item.selected_accessories) && item.selected_accessories.length > 0 ? <span>الملحقات: {item.selected_accessories.map((a) => a?.name_ar || a?.name || "ملحق").join("، ")}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden grid-cols-3 gap-4 border-t border-black p-2 text-xs print:grid">
                <span>التقطها: __________</span><span>راجعها: __________</span><span>عبّأها: __________</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, helper, icon: Icon }: { label: string; value: number; helper: string; icon: typeof Package }) => (
  <article className="rounded-[15px] border border-[#E5E9EF] bg-white p-[12px]">
    <div className="flex items-start justify-between gap-2">
      <div><p className="text-[7.5px] font-semibold text-[#818994]">{label}</p><p className="mt-[5px] text-[20px] font-bold leading-none text-[#343B44]">{value.toLocaleString("ar-EG")}</p><p className="mt-[6px] text-[6.5px] text-[#A0A7B0]">{helper}</p></div>
      <div className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]")}><Icon className="h-[13px] w-[13px]" /></div>
    </div>
  </article>
);

export default AdminOrderPreparationPage;
