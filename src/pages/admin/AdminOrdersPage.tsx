import { useMemo, useState } from "react";
import { useAdminOrders, useUpdateOrderStatus, useDeleteOrder, useBulkUpdateOrderStatus, useDeleteOrders } from "@/lib/admin/hooks";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
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
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
              className="pr-9 bg-background"
              dir="rtl"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm">تم تحديد <span className="font-bold text-primary">{selected.size}</span> طلب</p>
            <div className="flex gap-2 flex-wrap items-center">
              <Select value={bulkStatus} onValueChange={(v) => { setBulkStatus(v); bulkUpdateStatus(v); }}>
                <SelectTrigger className="h-8 w-44"><SelectValue placeholder="تغيير الحالة إلى..." /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="destructive" onClick={() => setConfirmDelete({ bulk: true })}>
                <Trash2 className="w-4 h-4 ml-1" /> حذف
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>إلغاء</Button>
            </div>
          </div>
        )}
      </div>

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
                    <p className="font-mono text-xs text-primary">{order.order_number}</p>
                    <p className="font-heading text-sm truncate">{order.customer_name}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">المتجر الموحد • {order.payment_method === "cod" ? "عند الاستلام" : "بنكي"}</span>
                  <span className="font-heading text-primary">{parseFloat(String(order.total)).toFixed(0)} {currencyOf()}</span>
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
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr className="text-xs">
                <th className="p-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></th>
                <th className="text-right p-3 font-heading">رقم الطلب</th>
                <th className="text-right p-3 font-heading">العميل</th>
                <th className="text-right p-3 font-heading">المجموع</th>
                <th className="text-right p-3 font-heading">الدفع</th>
                <th className="text-right p-3 font-heading">الحالة</th>
                <th className="text-right p-3 font-heading">التاريخ</th>
                <th className="text-right p-3 font-heading">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && orders.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-muted-foreground"><ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" /> لا توجد طلبات</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className={cn("border-b border-border hover:bg-muted/30 transition-colors", selected.has(order.id) && "bg-primary/5")}>
                  <td className="p-3"><Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} /></td>
                  <td className="p-3 font-mono text-xs text-primary">{order.order_number}</td>
                  <td className="p-3"><p className="font-body text-sm">{order.customer_name}</p><p className="text-xs text-muted-foreground" dir="ltr">{order.customer_phone}</p></td>
                  <td className="p-3 font-heading text-primary text-sm">{parseFloat(String(order.total)).toFixed(0)} {currencyOf()}</td>
                  <td className="p-3 text-xs">{order.payment_method === "cod" ? "عند الاستلام" : "بنكي"}</td>
                  <td className="p-3">
                    <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ar")}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedOrder(order)}><Eye className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => openWhatsApp(order)}><MessageCircle className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete({ id: order.id })}><Trash2 className="w-4 h-4" /></Button>
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