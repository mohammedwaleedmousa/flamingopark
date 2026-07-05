import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MessageCircle, Trash2, Users, Loader2, X, Globe2, Wallet } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useDebounce } from "@/hooks/useDebounce";

interface Customer {
  id: string;
  name: string;
  phone: string;
  country: string;
  created_at: string;
}

const PAGE_SIZE = 30;

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [spendMap, setSpendMap] = useState<Record<string, { total: number; count: number }>>({});
  const [total, setTotal] = useState(0);
  const { format } = useCurrency();
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [countryFilter, setCountryFilter] = useState<string>("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id?: string; bulk?: boolean } | null>(null);

  useEffect(() => { setPage(1); }, [search, countryFilter]);
  useEffect(() => { fetchCustomers(); /* eslint-disable-next-line */ }, [search, countryFilter, page]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setSelected(new Set());
    let q = supabase.from("customers").select("*", { count: "exact" });
    if (search.trim()) {
      const t = `%${search.trim()}%`;
      q = q.or(`name.ilike.${t},phone.ilike.${t}`);
    }
    if (countryFilter !== "all") q = q.eq("country", countryFilter);
    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await q.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) toast({ title: "خطأ", description: "فشل تحميل العملاء", variant: "destructive" });
    else {
      const list = (data || []) as Customer[];
      setCustomers(list);
      setTotal(count || 0);
      // Enrich with total spent from orders (by customer phone)
      const phones = list.map((c) => c.phone).filter(Boolean);
      if (phones.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("customer_phone,total")
          .in("customer_phone", phones);
        const map: Record<string, { total: number; count: number }> = {};
        (orders || []).forEach((o: any) => {
          const key = o.customer_phone;
          if (!key) return;
          if (!map[key]) map[key] = { total: 0, count: 0 };
          map[key].total += Number(o.total || 0);
          map[key].count += 1;
        });
        setSpendMap(map);
      } else {
        setSpendMap({});
      }
    }
    setIsLoading(false);
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast({ title: "خطأ", description: "فشل في الحذف", variant: "destructive" });
    else { toast({ title: "تم", description: "تم حذف العميل" }); fetchCustomers(); }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("customers").delete().in("id", ids);
    setBulkBusy(false);
    setConfirmDelete(null);
    if (error) toast({ title: "خطأ", description: "فشل الحذف الجماعي", variant: "destructive" });
    else { toast({ title: "تم", description: `تم حذف ${ids.length} عميل` }); fetchCustomers(); }
  };

  const openWhatsApp = (c: Customer) => {
    let p = c.phone.replace(/\D/g, "");
    if (p.startsWith("0")) p = p.substring(1);
    if (c.country === "YE" && !p.startsWith("967")) p = "967" + p;
    if (c.country === "SA" && !p.startsWith("966")) p = "966" + p;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(`مرحباً ${c.name}`)}`, "_blank");
  };

  const toggleSelectAll = () =>
    setSelected(selected.size === customers.length ? new Set() : new Set(customers.map(c => c.id)));
  const toggleSelect = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };
  const allSelected = useMemo(() => customers.length > 0 && selected.size === customers.length, [customers, selected]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground">العملاء</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="font-medium text-foreground">{total.toLocaleString("ar-EG")}</span> عميل إجمالاً
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="pr-9 bg-background"
              dir="rtl"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-full md:w-40"><Globe2 className="w-3.5 h-3.5 ml-1" /><SelectValue placeholder="البلد" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدول</SelectItem>
              <SelectItem value="SA">🇸🇦 السعودية</SelectItem>
              <SelectItem value="YE">🇾🇪 اليمن</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm">تم تحديد <span className="font-bold text-primary">{selected.size}</span> عميل</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => setConfirmDelete({ bulk: true })}>
                <Trash2 className="w-4 h-4 ml-1" /> حذف
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>إلغاء</Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr className="text-xs">
                <th className="p-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></th>
                <th className="text-right p-3 font-heading">الاسم</th>
                <th className="text-right p-3 font-heading">الهاتف</th>
                <th className="text-right p-3 font-heading">البلد</th>
                <th className="text-right p-3 font-heading">إجمالي الإنفاق</th>
                <th className="text-right p-3 font-heading">الطلبات</th>
                <th className="text-right p-3 font-heading">التسجيل</th>
                <th className="text-right p-3 font-heading">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && customers.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-3 opacity-50" /> لا يوجد عملاء</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className={cn("border-b border-border hover:bg-muted/30", selected.has(c.id) && "bg-primary/5")}>
                  <td className="p-3"><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>
                  <td className="p-3 text-sm font-body">{c.name}</td>
                  <td className="p-3 font-mono text-xs" dir="ltr">{c.phone}</td>
                  <td className="p-3 text-sm">{c.country === "SA" ? "🇸🇦 السعودية" : c.country === "YE" ? "🇾🇪 اليمن" : c.country}</td>
                  <td className="p-3 text-sm font-semibold text-primary">
                    <span className="inline-flex items-center gap-1"><Wallet className="w-3.5 h-3.5 opacity-60" />{format(spendMap[c.phone]?.total || 0)}</span>
                  </td>
                  <td className="p-3 text-xs">{spendMap[c.phone]?.count || 0}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ar-SA")}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => openWhatsApp(c)}><MessageCircle className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete({ id: c.id })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} className="px-4 border-t border-border" />
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>{confirmDelete?.bulk ? `سيتم حذف ${selected.size} عميل نهائياً.` : "سيتم حذف هذا العميل نهائياً."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (confirmDelete?.bulk) bulkDelete();
              else if (confirmDelete?.id) { deleteOne(confirmDelete.id); setConfirmDelete(null); }
            }}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCustomersPage;