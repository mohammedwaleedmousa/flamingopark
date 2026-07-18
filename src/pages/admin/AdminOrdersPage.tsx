import { useMemo, useState } from "react";
import { useAdminOrders, useUpdateOrderStatus, useDeleteOrder, useBulkUpdateOrderStatus, useDeleteOrders } from "@/lib/admin/hooks";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye, MessageCircle, Search, ShoppingCart, X, Phone, MapPin, Package,
  Trash2, Loader2, TrendingUp, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { TableCell } from "@/components/ui/table";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  country: string;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  coupon_code?: string | null;
  discount_amount?: number;
}

const PAGE_SIZE = 25;

const statusOptions = [
  { value: "pending",    label: "قيد الانتظار", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  { value: "confirmed",  label: "مؤكد",         color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { value: "processing", label: "قيد التجهيز",  color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  { value: "shipped",    label: "تم الشحن",     color: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30" },
  { value: "delivered",  label: "تم التوصيل",   color: "bg-green-500/15 text-green-600 border-green-500/30" },
  { value: "cancelled",  label: "ملغي",         color: "bg-red-500/15 text-red-600 border-red-500/30" },
];

const currencyOf = () => "ر.ي";

const AdminOrdersPage = () => {
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id?: string; bulk?: boolean } | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const ordersQuery = useAdminOrders({
    search,
    status: statusFilter,
    country: "all",
    page,
    pageSize: PAGE_SIZE,
  });
  const updateStatusMutation = useUpdateOrderStatus();
  const deleteOrderMutation = useDeleteOrder();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  const deleteOrdersMutation = useDeleteOrders();

  const orders = ordersQuery.data?.data ?? [];
  const total = ordersQuery.data?.count ?? 0;
  const isLoading = ordersQuery.isLoading || ordersQuery.isFetching;

  const updateStatus = async (orderId: string, newStatus: string) => {
    setSelectedOrder((current) => current?.id === orderId ? { ...current, status: newStatus } : current);
    await updateStatusMutation.mutateAsync({ orderId, newStatus });
    toast({ title: "تم", description: "تم تحديث حالة الطلب" });
  };

  const deleteOne = async (id: string) => {
    await deleteOrderMutation.mutateAsync(id);
    toast({ title: "تم", description: "تم حذف الطلب" });
    if (selectedOrder?.id === id) setSelectedOrder(null);
    setSelected(new Set());
  };

  const bulkUpdateStatus = async (s: string) => {
    if (!s || selected.size === 0) return;
    await bulkUpdateMutation.mutateAsync({ orderIds: Array.from(selected), newStatus: s });
    setBulkStatus("");
    setSelected(new Set());
    toast({ title: "تم", description: `تم تحديث ${selected.size} طلب` });
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    await deleteOrdersMutation.mutateAsync(Array.from(selected));
    setConfirmDelete(null);
    setSelected(new Set());
    toast({ title: "تم", description: `تم حذف ${selected.size} طلب` });
  };

  const toggleSelectAll = () =>
    setSelected(selected.size === orders.length ? new Set() : new Set(orders.map(o => o.id)));
  const toggleSelect = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };
  const allSelected = useMemo(() => orders.length > 0 && selected.size === orders.length, [orders, selected]);

  const getStatusBadge = (status: string) => {
    const info = statusOptions.find(s => s.value === status);
    return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap", info?.color)}>{info?.label || status}</span>;
  };

  const openWhatsApp = (order: Order) => {
    const message = `مرحباً ${order.customer_name}، بخصوص طلبك رقم ${order.order_number}`;
    let toPhone = order.customer_phone.replace(/\D/g, "");
    if (toPhone.startsWith("0")) toPhone = toPhone.substring(1);
    if (!toPhone.startsWith("967")) toPhone = "967" + toPhone;
    window.open(`https://wa.me/${toPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto px-4 md:px-6 py-8" dir="rtl">
      <AdminPageHeader
        category="إدارة المبيعات"
        title="الطلبات"
        description={`إدارة ${total.toLocaleString("ar-EG")} طلب`}
        actions={[
          {
            label: "عرض التحليلات",
            icon: BarChart3,
            href: "/admin/analytics",
            variant: "primary",
          },
          {
            label: "تقرير الإيرادات",
            icon: TrendingUp,
            href: "/admin/revenue",
            variant: "outline",
          },
        ]}
      />

      {/* Filters */}
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث برقم الطلب، اسم العميل أو رقم الهاتف..."
                className="h-12 rounded-2xl pr-11 pl-10 bg-background border-border"
                dir="rtl"
              />
              {searchInput && (
                <Button size="icon" variant="ghost" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl" onClick={() => setSearchInput("")}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-56 h-12 rounded-2xl">
                <SelectValue placeholder="فلترة حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500 text-white font-bold">
                  {selected.size}
                </span>
                <div>
                  <p className="font-semibold">طلبات محددة</p>
                  <p className="text-sm text-muted-foreground">يمكنك تنفيذ عمليات جماعية.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Select value={bulkStatus} onValueChange={(v) => { setBulkStatus(v); bulkUpdateStatus(v); }}>
                  <SelectTrigger className="h-10 w-52 rounded-xl">
                    <SelectValue placeholder="تغيير الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="destructive" className="rounded-xl" onClick={() => setConfirmDelete({ bulk: true })}>
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </Button>

                <Button variant="outline" className="rounded-xl" onClick={() => setSelected(new Set())}>
                  إلغاء التحديد
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading && orders.length === 0 ? (
          <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" /> لا توجد طلبات
          </div>
        ) : orders.map(order => (
          <div key={order.id} className={cn("bg-card border border-border rounded-xl p-3", selected.has(order.id) && "ring-1 ring-primary")}>
            <div className="flex items-start gap-3">
              <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <TableCell>
                          <span className="inline-flex px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 text-xs font-semibold font-mono">
                            #{order.order_number}
                          </span>
                        </TableCell>

                        <span className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString("ar", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">
                        {order.customer_name}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        order.payment_method === "cod"
                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : "bg-sky-50 text-sky-700 border border-sky-200"
                      )}
                    >
                      {order.payment_method === "cod" ? "💵 عند الاستلام" : "🏦 تحويل بنكي"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="inline-flex flex-col rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <TableCell>
                        <div className="inline-flex flex-col rounded-xl bg-emerald-500/10 px-3 py-2">
                          <span className="text-[10px] text-emerald-600">
                            الإجمالي
                          </span>

                          <span className="font-bold text-emerald-700">
                            {order.total.toFixed(2)} ر.ي
                          </span>
                        </div>
                      </TableCell>

                      <span className="font-bold text-emerald-700">
                        {parseFloat(String(order.total)).toFixed(0)} {currencyOf()}
                      </span>
                    </div>
                  </td>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString("ar")}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setSelectedOrder(order)}><Eye className="w-4 h-4" /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => openWhatsApp(order)}><MessageCircle className="w-4 h-4" /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete({ id: order.id })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="h-14 text-xs text-slate-600">
                <th className="p-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">رقم الطلب</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">العميل</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">المجموع</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">الدفع</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">الحالة</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">التاريخ</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && orders.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-muted-foreground"><ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" /> لا توجد طلبات</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className={cn("border-b border-slate-100 hover:bg-gradient-to-r hover:from-pink-50/40 hover:to-fuchsia-50/20 transition-all duration-300", selected.has(order.id) && "bg-primary/5")}>
                  <td className="p-3"><Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} /></td>
                  <td className="p-3 font-mono text-xs text-primary">{order.order_number}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center font-semibold shadow-sm">
                        {(order.customer_name || "?").charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {order.customer_name}
                        </p>

                        <p
                          className="text-xs text-muted-foreground font-mono"
                          dir="ltr"
                        >
                          {order.customer_phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-heading text-primary text-sm">{parseFloat(String(order.total)).toFixed(0)} {currencyOf()}</td>
                  <td className="p-3 text-xs">{order.payment_method === "cod" ? "عند الاستلام" : "بنكي"}</td>
                  <td className="p-3">
                    <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col text-xs">
                      <span className="font-medium">
                        {new Date(order.created_at).toLocaleDateString("ar")}
                      </span>

                      <span className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString("ar", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100/70 border border-slate-200 p-1.5 w-fit">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-600 shadow-sm transition-all duration-200 hover:scale-105"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-lg bg-white text-green-600 hover:bg-green-50 hover:text-green-700 shadow-sm transition-all duration-200 hover:scale-105"
                        onClick={() => openWhatsApp(order)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-lg bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-sm transition-all duration-200 hover:scale-105"
                        onClick={() => setConfirmDelete({ id: order.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} className="px-4 border-t border-border" />
      </div>

      <div className="md:hidden bg-card border border-border rounded-2xl px-3">
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedOrder(null)}>
          <div className="bg-background border-t md:border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background p-4 md:p-6 border-b border-border flex items-center justify-between z-10">
              <div>
                <h2 className="font-heading text-lg md:text-xl">تفاصيل الطلب</h2>
                <p className="text-sm text-primary font-mono">#{selectedOrder.order_number}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedOrder(null)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 md:p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">حالة الطلب</span>
                <Select value={selectedOrder.status} onValueChange={(v) => updateStatus(selectedOrder.id, v)}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center"><span>🏪</span></div>
                  <div><p className="font-heading">{selectedOrder.customer_name}</p><p className="text-xs text-muted-foreground">العميل</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center"><Phone className="w-5 h-5 text-green-600" /></div>
                  <div className="flex-1"><p dir="ltr" className="font-mono">{selectedOrder.customer_phone}</p><p className="text-xs text-muted-foreground">الهاتف</p></div>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600/30" onClick={() => openWhatsApp(selectedOrder)}><MessageCircle className="w-4 h-4 ml-2" />واتساب</Button>
                </div>
                {selectedOrder.customer_address && (
                  <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-blue-600" /></div>
                    <div><p className="text-sm">{selectedOrder.customer_address}</p><p className="text-xs text-muted-foreground mt-1">العنوان</p></div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="font-heading text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" /> المنتجات</h3>
                <div className="space-y-2">
                  {(selectedOrder.items as any[])?.map((item, i) => (
                    <div key={i} className="p-3 bg-card border border-border rounded-lg flex items-center gap-3">
                      {(item.image || item.product_image) && <img src={item.image || item.product_image} alt="" className="w-14 h-14 object-cover rounded-lg" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm truncate">{item.name || item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × {item.price} {currencyOf()}</p>
                      </div>
                      <span className="font-heading text-primary text-sm">{(item.quantity * item.price).toFixed(0)} {currencyOf()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{parseFloat(String(selectedOrder.subtotal)).toFixed(0)} {currencyOf()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">التوصيل</span><span>{parseFloat(String(selectedOrder.delivery_fee)).toFixed(0)} {currencyOf()}</span></div>
                {!!selectedOrder.discount_amount && selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600"><span>الخصم {selectedOrder.coupon_code && <Badge variant="outline" className="mr-1 text-[10px]">{selectedOrder.coupon_code}</Badge>}</span><span>-{parseFloat(String(selectedOrder.discount_amount)).toFixed(0)} {currencyOf()}</span></div>
                )}
                <div className="flex justify-between font-heading text-lg pt-3 border-t border-border"><span>الإجمالي</span><span className="text-primary">{parseFloat(String(selectedOrder.total)).toFixed(0)} {currencyOf()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>{confirmDelete?.bulk ? `سيتم حذف ${selected.size} طلب نهائياً.` : "سيتم حذف هذا الطلب نهائياً."}</AlertDialogDescription>
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

export default AdminOrdersPage;