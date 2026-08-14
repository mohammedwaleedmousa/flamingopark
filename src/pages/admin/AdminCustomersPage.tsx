import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BarChart3, Bell, FileText, Loader2, MessageCircle, Search, ShoppingBag, Trash2, UserCheck, Users, Wallet, X, Eye, MapPin, Phone, CalendarDays } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useDebounce } from "@/hooks/useDebounce";

interface Customer {
  id: string;
  name: string;
  phone: string;
  country: string;
  created_at: string;
}

type CustomerSpend = {
  total: number;
  count: number;
};

const PAGE_SIZE = 30;

const AdminCustomersPage = () => {
  const navigate = useNavigate();
  const { format } = useCurrency();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [spendMap, setSpendMap] = useState<Record<string, CustomerSpend>>({});
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id?: string; bulk?: boolean } | null>(null);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search]);

  useEffect(() => {
    void fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setSelected(new Set());

    let query = supabase.from("customers").select("*", { count: "exact" });

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},phone.ilike.${term}`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل العملاء", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const list = (data || []) as Customer[];

    setCustomers(list);
    setTotal(count || 0);

    const phones = Array.from(new Set(list.map((customer) => customer.phone).filter(Boolean)));

    if (phones.length === 0) {
      setSpendMap({});
      setIsLoading(false);
      return;
    }

    const { data: orders, error: ordersError } = await supabase.from("orders").select("customer_phone,total").in("customer_phone", phones);

    if (ordersError) {
      console.error("Failed to load customer spending", ordersError);
      setSpendMap({});
      setIsLoading(false);
      return;
    }

    const nextSpendMap: Record<string, CustomerSpend> = {};

    (orders || []).forEach((order: any) => {
      const phone = String(order.customer_phone || "");

      if (!phone) return;

      if (!nextSpendMap[phone]) {
        nextSpendMap[phone] = {
          total: 0,
          count: 0,
        };
      }

      nextSpendMap[phone].total += Number(order.total || 0);
      nextSpendMap[phone].count += 1;
    });

    setSpendMap(nextSpendMap);
    setIsLoading(false);
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في حذف العميل", variant: "destructive" });
      return;
    }

    toast({ title: "تم", description: "تم حذف العميل" });

    await fetchCustomers();
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;

    setBulkBusy(true);

    const ids = Array.from(selected);

    const { error } = await supabase.from("customers").delete().in("id", ids);

    setBulkBusy(false);
    setConfirmDelete(null);

    if (error) {
      toast({ title: "خطأ", description: "فشل الحذف الجماعي", variant: "destructive" });
      return;
    }

    toast({ title: "تم", description: `تم حذف ${ids.length} عميل` });

    await fetchCustomers();
  };

  const normalizeWhatsAppPhone = (customer: Customer) => {
    let phone = String(customer.phone || "").replace(/\D/g, "");

    if (phone.startsWith("00")) phone = phone.slice(2);

    if (phone.startsWith("967") || phone.startsWith("966")) return phone;

    if (phone.startsWith("0")) phone = phone.slice(1);

    if (String(customer.country || "").toUpperCase() === "SA") return `966${phone}`;

    return `967${phone}`;
  };

  const openWhatsApp = (customer: Customer) => {
    const phone = normalizeWhatsAppPhone(customer);
    const message = `مرحباً ${customer.name || ""}، معك فريق Flamingo Park`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const toggleSelectAll = () => {
    if (customers.length > 0 && customers.every((customer) => selected.has(customer.id))) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(customers.map((customer) => customer.id)));
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const allSelected = useMemo(() => customers.length > 0 && customers.every((customer) => selected.has(customer.id)), [customers, selected]);

  const pageStats = useMemo(() => {
    const customersWithOrders = customers.filter((customer) => Number(spendMap[customer.phone]?.count || 0) > 0).length;

    const orders = customers.reduce((sum, customer) => sum + Number(spendMap[customer.phone]?.count || 0), 0);

    const spend = customers.reduce((sum, customer) => sum + Number(spendMap[customer.phone]?.total || 0), 0);

    return {
      customersWithOrders,
      orders,
      spend,
    };
  }, [customers, spendMap]);

  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <AdminPageHeader
        category="العملاء"
        title="إدارة العملاء"
        description={`${total.toLocaleString("ar-EG")} عميل مسجل في Flamingo Park`}
        actions={[
          { label: "تحليل العملاء", icon: BarChart3, href: "/admin/reports/customers", variant: "primary" },
          { label: "التقارير", icon: FileText, href: "/admin/reports", variant: "outline" },
        ]}
      />

      {/* =====================================================
          KPI
      ===================================================== */}

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <CustomerStatCard title="إجمالي العملاء" value={total.toLocaleString("en-US")} helper="جميع العملاء المسجلين" icon={Users} tone="indigo" />
        <CustomerStatCard title="عملاء الصفحة" value={customers.length.toLocaleString("en-US")} helper={`${firstResult} - ${lastResult} من النتائج`} icon={UserCheck} tone="teal" />
        <CustomerStatCard title="لديهم طلبات" value={pageStats.customersWithOrders.toLocaleString("en-US")} helper="من العملاء الظاهرين حاليًا" icon={ShoppingBag} tone="blue" />
        <CustomerStatCard title="طلبات العملاء" value={pageStats.orders.toLocaleString("en-US")} helper="إجمالي طلبات الصفحة الحالية" icon={Wallet} tone="coral" />
      </section>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[11px]">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
              <Search className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[#444B55]">البحث في العملاء</p>
              <p className="mt-[2px] text-[7px] text-[#9BA2AC]">ابحث بالاسم أو رقم الهاتف</p>
            </div>
          </div>

          {searchInput && (
            <button type="button" onClick={() => setSearchInput("")} className="flex h-[29px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#8A919B] transition-colors hover:bg-[#F5F7F9] hover:text-[#555D68]">
              <X className="h-[10px] w-[10px]" />
              مسح البحث
            </button>
          )}
        </div>

        <div className="p-[12px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" strokeWidth={1.7} />

            <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="اسم العميل أو رقم الهاتف..." className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] pl-[34px] text-[10px] font-medium shadow-none placeholder:text-[#A4ABB4] focus-visible:border-[#D7DBE5] focus-visible:bg-white focus-visible:ring-0" />

            {searchInput && (
              <button type="button" onClick={() => setSearchInput("")} aria-label="مسح البحث" className="absolute left-[8px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[7px] text-[#9AA1AB] transition-colors hover:bg-white hover:text-[#5C6470]">
                <X className="h-[11px] w-[11px]" />
              </button>
            )}
          </div>

          {/* BULK */}

          {selected.size > 0 && (
            <div className="mt-[10px] flex flex-col gap-[9px] rounded-[12px] border border-[#DED9F1] bg-[#F8F6FF] p-[10px] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-[9px]">
                <div className="flex h-[31px] min-w-[31px] items-center justify-center rounded-[9px] bg-[#675CBA] px-[7px] text-[9px] font-bold text-white">{selected.size}</div>

                <div>
                  <p className="text-[9px] font-semibold text-[#544D7D]">عملاء محددون</p>
                  <p className="mt-[2px] text-[6.5px] text-[#918AAE]">سيتم تطبيق الإجراء على جميع العناصر المحددة</p>
                </div>
              </div>

              <div className="flex items-center gap-[6px]">
                <button type="button" disabled={bulkBusy} onClick={() => setConfirmDelete({ bulk: true })} className="flex h-[34px] items-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white px-[10px] text-[8px] font-semibold text-[#C15F56] transition-colors hover:bg-[#FFF3F1] disabled:opacity-40">
                  {bulkBusy ? <Loader2 className="h-[10px] w-[10px] animate-spin" /> : <Trash2 className="h-[10px] w-[10px]" />}
                  حذف المحدد
                </button>

                <button type="button" onClick={() => setSelected(new Set())} className="flex h-[34px] items-center rounded-[8px] px-[8px] text-[8px] font-semibold text-[#858D97] transition-colors hover:bg-white">إلغاء التحديد</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          MOBILE
      ===================================================== */}

      <section className="space-y-[8px] md:hidden">
        {isLoading && customers.length === 0 ? (
          <CustomerLoading />
        ) : customers.length === 0 ? (
          <EmptyCustomers />
        ) : (
          customers.map((customer) => {
            const spend = spendMap[customer.phone] || { total: 0, count: 0 };

            return (
              <article key={customer.id} className={cn("overflow-hidden rounded-[14px] border bg-white transition-colors", selected.has(customer.id) ? "border-[#CFC9EC] bg-[#FBFAFF]" : "border-[#E5E9EF]")}>
                <div className="p-[11px]">
                  <div className="flex items-start gap-[10px]">
                    <Checkbox checked={selected.has(customer.id)} onCheckedChange={() => toggleSelect(customer.id)} className="mt-[3px] h-[15px] w-[15px] border-[#BAC0C8] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />

                    <CustomerAvatar name={customer.name} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-[7px]">
                        <div className="min-w-0">
                          <h3 className="truncate text-[11px] font-semibold text-[#3B424C]">{customer.name || "عميل"}</h3>
                          <p dir="ltr" className="mt-[3px] truncate text-right text-[7.5px] text-[#8D949E]">{customer.phone}</p>
                        </div>

                        <CountryBadge country={customer.country} />
                      </div>

                      <div className="mt-[10px] grid grid-cols-2 gap-[6px]">
                        <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]">
                          <p className="text-[6.5px] text-[#9AA1AB]">إجمالي الإنفاق</p>
                          <p className="mt-[3px] truncate text-[9px] font-semibold text-[#454D57]">{format(spend.total)}</p>
                        </div>

                        <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]">
                          <p className="text-[6.5px] text-[#9AA1AB]">الطلبات</p>
                          <p dir="ltr" className="mt-[3px] text-right text-[10px] font-semibold text-[#454D57]">{spend.count.toLocaleString("en-US")}</p>
                        </div>
                      </div>

                      <div className="mt-[8px] flex items-center gap-[5px] text-[6.5px] text-[#9CA3AC]">
                        <CalendarDays className="h-[9px] w-[9px]" strokeWidth={1.6} />
                        <span>{formatCustomerDate(customer.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                  <MobileAction icon={Eye} label="التفاصيل" onClick={() => navigate(`/admin/customers/${customer.id}`)} tone="indigo" />
                  <MobileAction icon={Bell} label="إشعار" onClick={() => navigate(`/admin/customer-notifications?customerId=${customer.id}`)} tone="amber" />
                  <MobileAction icon={MessageCircle} label="واتساب" onClick={() => openWhatsApp(customer)} tone="green" />
                  <MobileAction icon={Trash2} label="حذف" onClick={() => setConfirmDelete({ id: customer.id })} tone="red" />
                </div>
              </article>
            );
          })
        )}

        <div className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white px-[8px]">
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </section>

      {/* =====================================================
          DESKTOP TABLE
      ===================================================== */}

      <section className="hidden overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[14px] py-[11px]">
          <div>
            <div className="flex items-center gap-[7px]">
              <Users className="h-[13px] w-[13px] text-[#675CBA]" strokeWidth={1.8} />
              <h2 className="text-[10px] font-semibold text-[#454C56]">قائمة العملاء</h2>
            </div>

            <p className="mt-[4px] text-[7px] text-[#9CA3AC]">عرض {firstResult.toLocaleString("ar-EG")} - {lastResult.toLocaleString("ar-EG")} من أصل {total.toLocaleString("ar-EG")}</p>
          </div>

          {isLoading && (
            <span className="flex items-center gap-[5px] text-[7px] font-medium text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[7.5px] font-semibold text-[#9299A3]">
                <th className="w-[42px] px-[10px] text-center">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="h-[15px] w-[15px] border-[#BAC0C8] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                </th>

                <th className="px-[10px] text-right font-semibold">العميل</th>
                <th className="px-[10px] text-right font-semibold">الهاتف</th>
                <th className="px-[10px] text-right font-semibold">البلد</th>
                <th className="px-[10px] text-right font-semibold">إجمالي الإنفاق</th>
                <th className="px-[10px] text-right font-semibold">الطلبات</th>
                <th className="px-[10px] text-right font-semibold">تاريخ التسجيل</th>
                <th className="w-[150px] px-[10px] text-center font-semibold">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-[260px] text-center">
                    <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyCustomers />
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const spend = spendMap[customer.phone] || { total: 0, count: 0 };

                  return (
                    <tr key={customer.id} className={cn("h-[68px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]", selected.has(customer.id) && "bg-[#FAF9FF]")}>
                      <td className="px-[10px] text-center">
                        <Checkbox checked={selected.has(customer.id)} onCheckedChange={() => toggleSelect(customer.id)} className="h-[15px] w-[15px] border-[#BAC0C8] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                      </td>

                      <td className="px-[10px]">
                        <button type="button" onClick={() => navigate(`/admin/customers/${customer.id}`)} className="flex min-w-[180px] items-center gap-[9px] text-right">
                          <CustomerAvatar name={customer.name} small />

                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate text-[10px] font-semibold text-[#424A54]">{customer.name || "عميل"}</p>

                            <p className="mt-[3px] text-[6.5px] text-[#A1A7B0]">Customer #{customer.id.slice(0, 6)}</p>
                          </div>
                        </button>
                      </td>

                      <td className="px-[10px]">
                        <div className="flex items-center gap-[6px]">
                          <div className="flex h-[25px] w-[25px] items-center justify-center rounded-[7px] bg-[#F2F4F7] text-[#7E8791]">
                            <Phone className="h-[10px] w-[10px]" strokeWidth={1.7} />
                          </div>

                          <span dir="ltr" className="text-right text-[8.5px] font-medium text-[#606873]">{customer.phone || "—"}</span>
                        </div>
                      </td>

                      <td className="px-[10px]">
                        <CountryBadge country={customer.country} />
                      </td>

                      <td className="px-[10px]">
                        <div className="flex items-center gap-[6px]">
                          <div className="flex h-[25px] w-[25px] items-center justify-center rounded-[7px] bg-[#EAF8F4] text-[#4C9687]">
                            <Wallet className="h-[10px] w-[10px]" strokeWidth={1.7} />
                          </div>

                          <span className="max-w-[130px] truncate text-[8.5px] font-semibold text-[#48505A]">{format(spend.total)}</span>
                        </div>
                      </td>

                      <td className="px-[10px]">
                        <div className="flex items-center gap-[6px]">
                          <span className={cn("flex h-[25px] min-w-[25px] items-center justify-center rounded-[7px] px-[6px] text-[7.5px] font-bold", spend.count > 0 ? "bg-[#EDF4FF] text-[#567BC5]" : "bg-[#F2F4F6] text-[#9097A0]")}>{spend.count.toLocaleString("en-US")}</span>

                          <span className="text-[7px] text-[#9DA4AD]">طلب</span>
                        </div>
                      </td>

                      <td className="px-[10px]">
                        <div className="flex items-center gap-[6px] text-[7.5px] text-[#808893]">
                          <CalendarDays className="h-[10px] w-[10px] text-[#A0A6AF]" strokeWidth={1.6} />
                          <span>{formatCustomerDate(customer.created_at)}</span>
                        </div>
                      </td>

                      <td className="px-[10px]">
                        <div className="flex items-center justify-center gap-[4px]">
                          <CustomerActionButton title="عرض التفاصيل" tone="indigo" onClick={() => navigate(`/admin/customers/${customer.id}`)}>
                            <Eye className="h-[12px] w-[12px]" />
                          </CustomerActionButton>

                          <CustomerActionButton title="إرسال إشعار" tone="amber" onClick={() => navigate(`/admin/customer-notifications?customerId=${customer.id}`)}>
                            <Bell className="h-[12px] w-[12px]" />
                          </CustomerActionButton>

                          <CustomerActionButton title="واتساب" tone="green" onClick={() => openWhatsApp(customer)}>
                            <MessageCircle className="h-[12px] w-[12px]" />
                          </CustomerActionButton>

                          <CustomerActionButton title="حذف العميل" tone="red" onClick={() => setConfirmDelete({ id: customer.id })}>
                            <Trash2 className="h-[12px] w-[12px]" />
                          </CustomerActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#EAEDF1] px-[10px]">
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </section>

      {/* =====================================================
          DELETE
      ===================================================== */}

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[420px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]">
              <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.7} />
            </div>

            <AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">تأكيد حذف العميل</AlertDialogTitle>

            <AlertDialogDescription className="text-[10px] leading-6 text-[#858D97]">
              {confirmDelete?.bulk ? `سيتم حذف ${selected.size} عميل نهائيًا من النظام. لا يمكن التراجع عن هذه العملية.` : "سيتم حذف هذا العميل نهائيًا من النظام. لا يمكن التراجع عن هذه العملية."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>

            <AlertDialogAction className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555]" onClick={() => {
              if (confirmDelete?.bulk) {
                void bulkDelete();
                return;
              }

              if (confirmDelete?.id) {
                const id = confirmDelete.id;
                setConfirmDelete(null);
                void deleteOne(id);
              }
            }}>
              {bulkBusy ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <Trash2 className="ml-[5px] h-[12px] w-[12px]" />}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   CUSTOMER STAT CARD
========================================================= */

const CustomerStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: typeof Users; tone: "indigo" | "teal" | "blue" | "coral" }) => {
  const styles = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    teal: { icon: "bg-[#EAF8F4] text-[#4C9687]", line: "bg-[#4C9687]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <div className="relative min-h-[116px] overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", styles.line)} />

      <div className="flex items-start justify-between">
        <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", styles.icon)}>
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
        </div>

        <span className="text-[6.5px] font-medium text-[#A2A8B1]">CUSTOMERS</span>
      </div>

      <p className="mt-[12px] text-[8px] font-medium text-[#8D949E]">{title}</p>
      <p dir="ltr" className="mt-[4px] text-right text-[20px] font-semibold leading-none tracking-[-0.035em] text-[#303741]">{value}</p>
      <p className="mt-[5px] text-[6.5px] text-[#A0A6AF]">{helper}</p>
    </div>
  );
};

/* =========================================================
   CUSTOMER AVATAR
========================================================= */

const CustomerAvatar = ({ name, small = false }: { name: string; small?: boolean }) => {
  const initial = String(name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#EEEAFE_0%,#E8F5FA_100%)] font-bold text-[#655DA0]", small ? "h-[34px] w-[34px] text-[10px]" : "h-[42px] w-[42px] text-[12px]")}>{initial}</div>
  );
};

/* =========================================================
   COUNTRY
========================================================= */

const countryLabel = (country: string) => {
  const value = String(country || "").toUpperCase();

  if (value === "SA" || value === "SAUDI" || value === "SAUDI ARABIA") return "السعودية";
  if (value === "YE" || value === "YEMEN") return "اليمن";

  return country || "غير محدد";
};

const CountryBadge = ({ country }: { country: string }) => {
  const value = String(country || "").toUpperCase();
  const saudi = value === "SA" || value === "SAUDI" || value === "SAUDI ARABIA";

  return (
    <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[7px] font-semibold", saudi ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E1DDF1] bg-[#F5F3FC] text-[#6D64A5]")}>
      <MapPin className="h-[8px] w-[8px]" strokeWidth={1.8} />
      {countryLabel(country)}
    </span>
  );
};

/* =========================================================
   DATE
========================================================= */

const formatCustomerDate = (value: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/* =========================================================
   DESKTOP ACTION
========================================================= */

const CustomerActionButton = ({ children, title, tone, onClick }: { children: React.ReactNode; title: string; tone: "indigo" | "amber" | "green" | "red"; onClick: () => void }) => {
  const styles = {
    indigo: "border-[#E2DEF3] text-[#675CBA] hover:bg-[#F5F3FF]",
    amber: "border-[#EEDFC4] text-[#B17B33] hover:bg-[#FFF8EC]",
    green: "border-[#D9E9DE] text-[#57906A] hover:bg-[#F0F8F2]",
    red: "border-[#F0D7D4] text-[#C15F56] hover:bg-[#FFF3F1]",
  }[tone];

  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border bg-white transition-colors", styles)}>{children}</button>
  );
};

/* =========================================================
   MOBILE ACTION
========================================================= */

const MobileAction = ({ icon: Icon, label, tone, onClick }: { icon: typeof Eye; label: string; tone: "indigo" | "amber" | "green" | "red"; onClick: () => void }) => {
  const styles = {
    indigo: "text-[#675CBA]",
    amber: "text-[#B17B33]",
    green: "text-[#57906A]",
    red: "text-[#C15F56]",
  }[tone];

  return (
    <button type="button" onClick={onClick} className={cn("flex h-[36px] flex-col items-center justify-center gap-[2px] rounded-[8px] border border-[#E5E9EF] bg-white transition-colors active:bg-[#F5F7F9]", styles)}>
      <Icon className="h-[11px] w-[11px]" strokeWidth={1.7} />
      <span className="text-[5.8px] font-semibold">{label}</span>
    </button>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyCustomers = () => {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
        <Users className="h-[19px] w-[19px]" strokeWidth={1.5} />
      </div>

      <h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا يوجد عملاء</h3>
      <p className="mt-[4px] text-[7.5px] leading-5 text-[#9BA2AC]">لم نجد أي عميل مطابق لعملية البحث الحالية.</p>
    </div>
  );
};

/* =========================================================
   LOADING
========================================================= */

const CustomerLoading = () => {
  return (
    <div className="flex h-[230px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
      <div className="text-center">
        <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" />
        <p className="mt-2 text-[7.5px] font-medium text-[#969DA7]">جاري تحميل العملاء...</p>
      </div>
    </div>
  );
};

export default AdminCustomersPage;