import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareText, Pin, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  addCustomerInternalNote,
  addOrderInternalNote,
  listCustomerInternalNotes,
  listOrderInternalNotes,
  type InternalNote,
} from "@/lib/adminProductivity";
import { cn } from "@/lib/utils";

type OrderOption = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
};

type Props =
  | { mode: "customer"; entityId: string; label?: string }
  | { mode: "orders"; entityId?: never; label?: string };

const AdminInternalNotesDock = (props: Props) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [pinned, setPinned] = useState(false);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const entityId = props.mode === "customer" ? props.entityId : selectedOrderId;
  const title = props.mode === "customer" ? "ملاحظات العميل الداخلية" : "ملاحظات الطلب الداخلية";

  const loadNotes = useCallback(async () => {
    if (!entityId) {
      setNotes([]);
      return;
    }
    setLoading(true);
    try {
      const data = props.mode === "customer"
        ? await listCustomerInternalNotes(entityId)
        : await listOrderInternalNotes(entityId);
      setNotes(data);
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحميل الملاحظات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [entityId, props.mode]);

  useEffect(() => {
    if (!open) return;
    void loadNotes();
  }, [open, loadNotes]);

  useEffect(() => {
    if (!open || props.mode !== "orders" || orders.length > 0) return;
    const loadOrders = async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id,order_number,customer_name,customer_phone,status")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.error(error);
        toast({ title: "تعذر تحميل الطلبات", variant: "destructive" });
        return;
      }
      setOrders((data ?? []) as OrderOption[]);
    };
    void loadOrders();
  }, [open, orders.length, props.mode]);

  const visibleOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders.slice(0, 12);
    return orders.filter((order) => [order.order_number, order.customer_name, order.customer_phone]
      .some((value) => String(value || "").toLowerCase().includes(q))).slice(0, 20);
  }, [orderSearch, orders]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;

  const add = async () => {
    if (!entityId) return;
    const clean = note.trim();
    if (!clean) {
      toast({ title: "اكتب الملاحظة أولًا" });
      return;
    }
    setSaving(true);
    try {
      if (props.mode === "customer") await addCustomerInternalNote(entityId, clean, pinned);
      else await addOrderInternalNote(entityId, clean, pinned);
      setNote("");
      setPinned(false);
      await loadNotes();
      toast({ title: "تم حفظ الملاحظة الداخلية" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر الحفظ";
      toast({ title: "تعذر حفظ الملاحظة", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[18px] left-[18px] z-[70] inline-flex h-[40px] items-center gap-[7px] rounded-[12px] border border-[#DDD8F4] bg-white px-[12px] text-[8.5px] font-semibold text-[#675CBA] shadow-[0_8px_30px_rgba(35,42,55,0.12)] transition hover:bg-[#F7F5FF]"
      >
        <MessageSquareText className="h-[14px] w-[14px]" />
        {props.label || "ملاحظات داخلية"}
        {notes.length > 0 ? <span className="rounded-full bg-[#675CBA] px-[6px] py-[2px] text-[6px] text-white">{notes.length}</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] bg-[#202631]/30 backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <aside className="absolute inset-y-0 left-0 w-full overflow-y-auto border-r border-[#E4E8ED] bg-[#F7F8FA] shadow-[20px_0_50px_rgba(26,33,45,0.12)] sm:max-w-[430px]" onMouseDown={(event) => event.stopPropagation()} dir="rtl">
            <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-[#E5E9EF] bg-white/95 px-[14px] py-[13px] backdrop-blur">
              <div>
                <p className="text-[7px] font-semibold tracking-[0.05em] text-[#9BA2AC]">INTERNAL ONLY</p>
                <h2 className="mt-[4px] text-[14px] font-semibold text-[#353C46]">{title}</h2>
                <p className="mt-[3px] text-[7px] text-[#929AA5]">لا تظهر هذه الملاحظات للعميل.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-[32px] w-[32px] items-center justify-center rounded-[9px] border border-[#E3E7EC] bg-white text-[#777F8A] hover:bg-[#F5F7F9]"><X className="h-[13px] w-[13px]" /></button>
            </div>

            <div className="space-y-[10px] p-[10px]">
              {props.mode === "orders" ? (
                <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]">
                  <p className="text-[9px] font-semibold text-[#4A525C]">اختر الطلب</p>
                  <div className="relative mt-[8px]">
                    <Search className="absolute right-[10px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#9AA2AC]" />
                    <Input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="رقم الطلب، اسم العميل أو الهاتف" className="h-[36px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[31px] text-[8.5px] shadow-none focus-visible:ring-0" />
                  </div>
                  <div className="mt-[7px] max-h-[210px] space-y-[5px] overflow-y-auto">
                    {visibleOrders.map((order) => (
                      <button key={order.id} type="button" onClick={() => setSelectedOrderId(order.id)} className={cn("flex w-full items-center justify-between gap-3 rounded-[9px] border px-[9px] py-[8px] text-right transition", selectedOrderId === order.id ? "border-[#CFC8F2] bg-[#F5F2FF]" : "border-[#E8EBEF] bg-[#FBFCFD] hover:bg-[#F7F9FB]")}>
                        <div className="min-w-0"><p dir="ltr" className="truncate text-right text-[8.5px] font-semibold text-[#4B535E]">#{order.order_number}</p><p className="mt-[2px] truncate text-[7px] text-[#9199A4]">{order.customer_name} • {order.customer_phone}</p></div>
                        <span className="shrink-0 rounded-full bg-white px-[6px] py-[3px] text-[6px] text-[#808894]">{order.status}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {props.mode === "orders" && !selectedOrder ? (
                <section className="grid min-h-[170px] place-items-center rounded-[14px] border border-[#E5E9EF] bg-white px-4 text-center">
                  <div><MessageSquareText className="mx-auto h-5 w-5 text-[#9AA2AC]" /><p className="mt-2 text-[9px] font-semibold text-[#555D68]">اختر طلبًا لإدارة ملاحظاته</p></div>
                </section>
              ) : (
                <>
                  {selectedOrder ? <div className="rounded-[11px] border border-[#DDD8F4] bg-[#F7F5FF] px-[10px] py-[8px] text-[8px] text-[#5D558C]">الطلب المحدد: <strong dir="ltr">#{selectedOrder.order_number}</strong> — {selectedOrder.customer_name}</div> : null}

                  <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]">
                    <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: العميل يفضّل التواصل مساءً، راجع المقاس قبل الشحن..." className="min-h-[90px] resize-none rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] leading-6 shadow-none focus-visible:ring-0" />
                    <div className="mt-[8px] flex items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-[6px] text-[7.5px] text-[#737C87]"><Checkbox checked={pinned} onCheckedChange={(value) => setPinned(value === true)} /><Pin className="h-[11px] w-[11px]" />تثبيت الملاحظة</label>
                      <Button onClick={() => void add()} disabled={saving || !entityId} className="h-[32px] rounded-[8px] bg-[#675CBA] px-[10px] text-[8px] text-white hover:bg-[#5D52AE]">
                        {saving ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <Plus className="ml-1 h-3 w-3" />}حفظ
                      </Button>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                    <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[11px] py-[9px]"><p className="text-[9px] font-semibold text-[#4A525C]">السجل الداخلي</p><span className="text-[7px] text-[#939BA6]">{notes.length} ملاحظة</span></div>
                    {loading ? <div className="grid min-h-[120px] place-items-center"><Loader2 className="h-4 w-4 animate-spin text-[#675CBA]" /></div> : notes.length === 0 ? <div className="grid min-h-[120px] place-items-center px-4 text-center text-[8px] text-[#969EA8]">لا توجد ملاحظات داخلية حتى الآن.</div> : (
                      <div className="divide-y divide-[#EDF0F3]">
                        {notes.map((item) => (
                          <div key={item.id} className={cn("p-[10px]", item.is_pinned && "bg-[#FFF9EE]")}>
                            <div className="flex items-start justify-between gap-2"><p className="text-[8.5px] leading-6 text-[#535B65]">{item.note}</p>{item.is_pinned ? <Pin className="mt-1 h-[11px] w-[11px] shrink-0 text-[#B17B33]" /> : null}</div>
                            <p className="mt-[4px] text-[6.5px] text-[#9BA2AC]">{new Date(item.created_at).toLocaleString("ar-EG")}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default AdminInternalNotesDock;
