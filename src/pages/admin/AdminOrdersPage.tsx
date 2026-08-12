import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  useAdminOrders,
  useUpdateOrderStatus,
  useDeleteOrder,
  useBulkUpdateOrderStatus,
  useDeleteOrders,
} from "@/lib/admin/hooks";

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  Phone,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useDebounce } from "@/hooks/useDebounce";

/* =========================================================
   TYPES
========================================================= */

type CurrencyMode = "SAR" | "YER_SOUTH" | "YER_NORTH";

interface OrderItem {
  product_id?: string;
  product_name?: string;
  name?: string;
  product_image?: string;
  image?: string;
  price?: number;
  quantity?: number;
  selected_size?: string | null;
  selected_color?: string | null;
  selected_accessories?: any[];
}

interface Order {
  id: string;
  order_number: string;

  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;

  customer_city?: string | null;
  customer_region?: string | null;
  customer_notes?: string | null;

  country: string;

  items: OrderItem[] | any;

  subtotal: number;
  delivery_fee: number;
  total: number;
  total_base?: number | null;

  payment_method: string;
  status: string;

  created_at: string;
  updated_at?: string;

  coupon_code?: string | null;
  discount_amount?: number;

  currency_mode?: CurrencyMode | string | null;
  currency_code?: string | null;
  exchange_rate_snapshot?: number | null;
}

type DeleteConfirmation = {
  id?: string;
  bulk?: boolean;
} | null;

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 25;

const statusOptions = [
  {
    value: "pending",
    label: "قيد الانتظار",
    className: "border-[#EEDCB6] bg-[#FFF7E8] text-[#A9782F]",
    dot: "#D7A549",
    icon: Clock3,
  },
  {
    value: "confirmed",
    label: "مؤكد",
    className: "border-[#D9E5F3] bg-[#F1F6FC] text-[#557CA4]",
    dot: "#789CC2",
    icon: CheckCircle2,
  },
  {
    value: "processing",
    label: "قيد التجهيز",
    className: "border-[#E2DCEF] bg-[#F6F2FA] text-[#786993]",
    dot: "#8F7AA8",
    icon: Package,
  },
  {
    value: "shipped",
    label: "تم الشحن",
    className: "border-[#D6E5E8] bg-[#EFF7F8] text-[#557E86]",
    dot: "#66939B",
    icon: Truck,
  },
  {
    value: "delivered",
    label: "تم التوصيل",
    className: "border-[#CFE9D8] bg-[#EAF7EF] text-[#3F9262]",
    dot: "#59B97B",
    icon: PackageCheck,
  },
  {
    value: "cancelled",
    label: "ملغي",
    className: "border-[#F0D4D4] bg-[#FCEEEE] text-[#BA6464]",
    dot: "#D17373",
    icon: AlertTriangle,
  },
];

const countryOptions = [
  { value: "all", label: "كل الدول" },
  { value: "YE", label: "اليمن" },
  { value: "SA", label: "السعودية" },
];

/* =========================================================
   HELPERS
========================================================= */

const fmt = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const currencySymbol = (order: Order) => {
  if (
    order.currency_mode === "SAR" ||
    String(order.currency_code || "").toUpperCase() === "SAR"
  ) {
    return "ر.س";
  }

  return "ر.ي";
};

const currencyName = (order: Order) => {
  if (
    order.currency_mode === "SAR" ||
    String(order.currency_code || "").toUpperCase() === "SAR"
  ) {
    return "ريال سعودي";
  }

  if (order.currency_mode === "YER_NORTH") {
    return "ريال يمني · شمال";
  }

  if (order.currency_mode === "YER_SOUTH") {
    return "ريال يمني · جنوب";
  }

  return "ريال يمني";
};

const orderTotal = (order: Order) => {
  return Number(order.total || 0);
};

const itemsOf = (order: Order): OrderItem[] => {
  return Array.isArray(order.items) ? order.items : [];
};

const itemsCount = (order: Order) => {
  return itemsOf(order).reduce((sum, item) => {
    return sum + Math.max(1, Number(item.quantity || 1));
  }, 0);
};

const orderLocation = (order: Order) => {
  if (order.customer_region) return order.customer_region;
  if (order.customer_city) return order.customer_city;
  if (order.customer_address) return order.customer_address;

  if (order.country === "SA") return "السعودية";
  if (order.country === "YE") return "اليمن";

  return order.country || "غير محدد";
};

const paymentLabel = (paymentMethod: string) => {
  const value = String(paymentMethod || "").toLowerCase();

  const labels: Record<string, string> = {
    cod: "الدفع عند الاستلام",
    cash: "نقدًا",
    bank: "تحويل بنكي",
    bank_transfer: "تحويل بنكي",
    transfer: "تحويل بنكي",
    card: "بطاقة",
    mada: "مدى",
    apple_pay: "Apple Pay",
  };

  return labels[value] || paymentMethod || "غير محدد";
};

const formatOrderDate = (date: string) => {
  const value = new Date(date);

  return {
    date: value.toLocaleDateString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),

    time: value.toLocaleTimeString("ar", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const normalizeWhatsAppPhone = (order: Order) => {
  let phone = String(order.customer_phone || "").replace(/\D/g, "");

  if (phone.startsWith("00")) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("967") || phone.startsWith("966")) {
    return phone;
  }

  if (phone.startsWith("0")) {
    phone = phone.slice(1);
  }

  if (order.country === "SA") {
    return `966${phone}`;
  }

  return `967${phone}`;
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({ status }: { status: string }) => {
  const info = statusOptions.find((item) => item.value === status);

  if (!info) {
    return (
      <span className="inline-flex rounded-full border border-[#E3E5E1] bg-[#F4F5F3] px-3 py-1 text-[11px] text-[#777C77]">
        {status}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex h-[28px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium whitespace-nowrap", info.className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.dot }} />
      {info.label}
    </span>
  );
};

/* =========================================================
   PAYMENT BADGE
========================================================= */

const PaymentBadge = ({ paymentMethod }: { paymentMethod: string }) => {
  const cod = String(paymentMethod || "").toLowerCase() === "cod";

  return (
    <span className={cn("inline-flex h-[28px] items-center gap-1.5 rounded-full border px-3 text-[11px] whitespace-nowrap", cod ? "border-[#E8E3D4] bg-[#F8F5EC] text-[#81704B]" : "border-[#DCE6E8] bg-[#F1F6F7] text-[#59777D]")}>
      <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={1.5} />
      {paymentLabel(paymentMethod)}
    </span>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyOrders = () => {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF1ED]">
        <ShoppingCart className="h-5 w-5 text-[#818981]" strokeWidth={1.5} />
      </div>

      <h3 className="mt-3 text-[14px] font-medium text-[#4D524D]">
        لا توجد طلبات
      </h3>

      <p className="mt-1 text-[11px] text-[#999E99]">
        لم نجد طلبات مطابقة للبحث أو الفلاتر الحالية.
      </p>
    </div>
  );
};

/* =========================================================
   PAGE
========================================================= */

const AdminOrdersPage = () => {
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);

  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [confirmDelete, setConfirmDelete] =
    useState<DeleteConfirmation>(null);

  const [bulkStatus, setBulkStatus] = useState("");

  /* =========================================================
     QUERIES
  ========================================================= */

  const ordersQuery = useAdminOrders({
    search,
    status: statusFilter,
    country: countryFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const updateStatusMutation = useUpdateOrderStatus();
  const deleteOrderMutation = useDeleteOrder();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  const deleteOrdersMutation = useDeleteOrders();

  /* =========================================================
     DATA
  ========================================================= */

  const orders = (ordersQuery.data?.data ?? []) as Order[];

  const total = Number(ordersQuery.data?.count ?? 0);

  const firstResult =
    total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastResult = Math.min(page * PAGE_SIZE, total);

  const isLoading =
    ordersQuery.isLoading || ordersQuery.isFetching;

  const allSelected = useMemo(() => {
    return (
      orders.length > 0 &&
      orders.every((order) => selected.has(order.id))
    );
  }, [orders, selected]);

  const pageStats = useMemo(() => {
    const pending = orders.filter(
      (order) => order.status === "pending",
    ).length;

    const delivered = orders.filter(
      (order) => order.status === "delivered",
    ).length;

    return {
      pending,
      delivered,
    };
  }, [orders]);

  /* =========================================================
     RESET PAGE
  ========================================================= */

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, countryFilter]);

  useEffect(() => {
    setSelected((current) => {
      const visibleIds = new Set(
        orders.map((order) => order.id),
      );

      const next = new Set(
        Array.from(current).filter((id) =>
          visibleIds.has(id),
        ),
      );

      return next;
    });
  }, [orders]);

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  const updateStatus = async (
    orderId: string,
    newStatus: string,
  ) => {
    try {
      setSelectedOrder((current) =>
        current?.id === orderId
          ? {
              ...current,
              status: newStatus,
            }
          : current,
      );

      await updateStatusMutation.mutateAsync({
        orderId,
        newStatus,
      });

      toast({
        title: "تم تحديث الطلب",
        description: `تم تغيير الحالة إلى ${
          statusOptions.find(
            (item) => item.value === newStatus,
          )?.label || newStatus
        }`,
      });
    } catch (error) {
      console.error(error);

      toast({
        title: "تعذر تحديث الطلب",
        description:
          "حدث خطأ أثناء تحديث حالة الطلب.",
        variant: "destructive",
      });
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteOne = async (id: string) => {
    try {
      await deleteOrderMutation.mutateAsync(id);

      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }

      setSelected((current) => {
        const next = new Set(current);
        next.delete(id);

        return next;
      });

      toast({
        title: "تم حذف الطلب",
        description: "تم حذف الطلب بنجاح.",
      });
    } catch (error) {
      console.error(error);

      toast({
        title: "تعذر حذف الطلب",
        description:
          "حدث خطأ أثناء حذف الطلب.",
        variant: "destructive",
      });
    }
  };

  /* =========================================================
     BULK UPDATE
  ========================================================= */

  const bulkUpdateStatus = async (
    newStatus: string,
  ) => {
    if (!newStatus || selected.size === 0) {
      return;
    }

    const orderIds = Array.from(selected);
    const count = orderIds.length;

    try {
      await bulkUpdateMutation.mutateAsync({
        orderIds,
        newStatus,
      });

      setBulkStatus("");
      setSelected(new Set());

      toast({
        title: "تم تحديث الطلبات",
        description: `تم تحديث ${count} طلب.`,
      });
    } catch (error) {
      console.error(error);

      toast({
        title: "تعذر تحديث الطلبات",
        description:
          "حدث خطأ أثناء تنفيذ العملية الجماعية.",
        variant: "destructive",
      });
    }
  };

  /* =========================================================
     BULK DELETE
  ========================================================= */

  const bulkDelete = async () => {
    if (selected.size === 0) {
      return;
    }

    const orderIds = Array.from(selected);
    const count = orderIds.length;

    try {
      await deleteOrdersMutation.mutateAsync(
        orderIds,
      );

      setConfirmDelete(null);
      setSelected(new Set());

      toast({
        title: "تم حذف الطلبات",
        description: `تم حذف ${count} طلب.`,
      });
    } catch (error) {
      console.error(error);

      toast({
        title: "تعذر حذف الطلبات",
        description:
          "حدث خطأ أثناء حذف الطلبات.",
        variant: "destructive",
      });
    }
  };

  /* =========================================================
     SELECTION
  ========================================================= */

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }

    setSelected(
      new Set(orders.map((order) => order.id)),
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  /* =========================================================
     WHATSAPP
  ========================================================= */

  const openWhatsApp = (order: Order) => {
    const message = `مرحباً ${order.customer_name}، بخصوص طلبك رقم ${order.order_number}`;

    const phone =
      normalizeWhatsAppPhone(order);

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  /* =========================================================
     FILTERS
  ========================================================= */

  const clearFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
    setCountryFilter("all");
  };

  const hasFilters =
    Boolean(searchInput) ||
    statusFilter !== "all" ||
    countryFilter !== "all";

  const updatingOrderId = (
    updateStatusMutation.variables as any
  )?.orderId;

  return (
    <div dir="rtl" className="min-h-full w-full bg-[#F1F2EF] p-2.5 md:p-3">
      <div className="w-full space-y-2.5">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="flex flex-col gap-3 px-0.5 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] text-[#9BA09B]">
              إدارة المبيعات
            </div>

            <h1 className="mt-0.5 text-[22px] font-medium tracking-[-0.025em] text-[#292C29] md:text-[24px]">
              الطلبات
            </h1>

            <p className="mt-1 text-[12px] text-[#979C97]">
              إدارة ومتابعة {fmt(total)} طلب في Flamingo Park
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/admin/revenue" className="flex h-[38px] items-center gap-2 rounded-full border border-[#E6E8E4] bg-[#FBFBFA] px-4 text-[11px] text-[#596159] transition hover:bg-white">
              <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
              الإيرادات
            </Link>

            <Link to="/admin/analytics" className="flex h-[38px] items-center gap-2 rounded-full border border-[#E6E8E4] bg-[#FBFBFA] px-4 text-[11px] text-[#596159] transition hover:bg-white">
              <BarChart3 className="h-4 w-4" strokeWidth={1.5} />
              التحليلات
            </Link>
          </div>
        </header>

        {/* =====================================================
            STATS
        ====================================================== */}

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-[13px] border border-[#E7E8E4] bg-[#FBFBFA] px-4 py-3.5">
            <div className="text-[11px] text-[#999E99]">
              إجمالي النتائج
            </div>

            <div dir="ltr" className="mt-2 text-right text-[22px] font-medium tracking-[-0.03em] text-[#303430]">
              {fmt(total)}
            </div>

            <div className="mt-1 text-[10px] text-[#A4A8A4]">
              حسب الفلاتر الحالية
            </div>
          </div>

          <div className="rounded-[13px] border border-[#E7E8E4] bg-[#FBFBFA] px-4 py-3.5">
            <div className="text-[11px] text-[#999E99]">
              طلبات الصفحة
            </div>

            <div dir="ltr" className="mt-2 text-right text-[22px] font-medium tracking-[-0.03em] text-[#303430]">
              {fmt(orders.length)}
            </div>

            <div className="mt-1 text-[10px] text-[#A4A8A4]">
              {firstResult} - {lastResult}
            </div>
          </div>

          <div className="rounded-[13px] border border-[#E7E8E4] bg-[#FBFBFA] px-4 py-3.5">
            <div className="text-[11px] text-[#999E99]">
              معلقة في الصفحة
            </div>

            <div dir="ltr" className="mt-2 text-right text-[22px] font-medium tracking-[-0.03em] text-[#A9782F]">
              {fmt(pageStats.pending)}
            </div>

            <div className="mt-1 text-[10px] text-[#A4A8A4]">
              تحتاج متابعة
            </div>
          </div>

          <div className="rounded-[13px] border border-[#E7E8E4] bg-[#FBFBFA] px-4 py-3.5">
            <div className="text-[11px] text-[#999E99]">
              تم توصيلها
            </div>

            <div dir="ltr" className="mt-2 text-right text-[22px] font-medium tracking-[-0.03em] text-[#419165]">
              {fmt(pageStats.delivered)}
            </div>

            <div className="mt-1 text-[10px] text-[#A4A8A4]">
              من الصفحة الحالية
            </div>
          </div>
        </section>

        {/* =====================================================
            FILTERS
        ====================================================== */}

        <section className="rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3">
          <div className="flex flex-col gap-2 lg:flex-row">

            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#959A95]" strokeWidth={1.5} />

              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="رقم الطلب، اسم العميل أو رقم الهاتف..." className="h-[42px] rounded-[10px] border-[#E4E6E2] bg-[#F7F8F6] pr-10 pl-10 text-[12px] shadow-none placeholder:text-[#A5AAA5] focus-visible:ring-1 focus-visible:ring-[#8A9484]" />

              {searchInput ? (
                <button type="button" onClick={() => setSearchInput("")} className="absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#939893] transition hover:bg-[#EAEBE8]">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-[42px] w-full rounded-[10px] border-[#E4E6E2] bg-[#F7F8F6] px-3 text-[12px] shadow-none lg:w-[180px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  كل الحالات
                </SelectItem>

                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-[42px] w-full rounded-[10px] border-[#E4E6E2] bg-[#F7F8F6] px-3 text-[12px] shadow-none lg:w-[160px]">
                <SelectValue placeholder="الدولة" />
              </SelectTrigger>

              <SelectContent>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters ? (
              <Button variant="ghost" onClick={clearFilters} className="h-[42px] rounded-[10px] px-3 text-[11px] font-normal text-[#777D77] hover:bg-[#F0F1EE]">
                <X className="ml-1.5 h-3.5 w-3.5" />
                مسح الفلاتر
              </Button>
            ) : null}
          </div>

          {/* =================================================
              BULK
          ================================================= */}

          {selected.size > 0 ? (
            <div className="mt-3 flex flex-col gap-3 rounded-[11px] border border-[#DDE3DA] bg-[#F2F5F0] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[#59634D] px-2 text-[12px] font-medium text-white">
                  {selected.size}
                </div>

                <div>
                  <div className="text-[12px] font-medium text-[#4A5048]">
                    طلبات محددة
                  </div>

                  <div className="mt-0.5 text-[10px] text-[#8A9088]">
                    يمكنك تنفيذ إجراء واحد على جميع الطلبات المحددة.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={bulkStatus} onValueChange={(value) => { setBulkStatus(value); void bulkUpdateStatus(value); }}>
                  <SelectTrigger className="h-[36px] w-[160px] rounded-[8px] border-[#DDE1DA] bg-white text-[11px] shadow-none">
                    <SelectValue placeholder="تغيير الحالة" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => setSelected(new Set())} className="h-[36px] rounded-[8px] border-[#DDE1DA] bg-white px-3 text-[11px] font-normal shadow-none">
                  إلغاء التحديد
                </Button>

                <Button variant="outline" onClick={() => setConfirmDelete({ bulk: true })} className="h-[36px] rounded-[8px] border-[#EDD8D8] bg-[#FFF9F9] px-3 text-[11px] font-normal text-[#B65F5F] shadow-none hover:bg-[#FBECEC] hover:text-[#A95454]">
                  <Trash2 className="ml-1.5 h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {/* =====================================================
            MOBILE
        ====================================================== */}

        <section className="space-y-2 md:hidden">
          {isLoading && orders.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA]">
              <Loader2 className="h-6 w-6 animate-spin text-[#7D8579]" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA]">
              <EmptyOrders />
            </div>
          ) : (
            orders.map((order) => {
              const date = formatOrderDate(order.created_at);

              const updating =
                updateStatusMutation.isPending &&
                updatingOrderId === order.id;

              return (
                <article key={order.id} className={cn("overflow-hidden rounded-[13px] border bg-[#FBFBFA] transition", selected.has(order.id) ? "border-[#AAB3A4] ring-1 ring-[#D9DED6]" : "border-[#E7E8E4]")}>
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} className="mt-1 h-4 w-4 border-[#AEB4AE] data-[state=checked]:border-[#59634D] data-[state=checked]:bg-[#59634D]" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div dir="ltr" className="w-fit text-right text-[12px] font-medium text-[#545A54]">
                              #{order.order_number}
                            </div>

                            <div className="mt-1 truncate text-[14px] font-medium text-[#303430]">
                              {order.customer_name || "عميل"}
                            </div>
                          </div>

                          <StatusBadge status={order.status} />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-[9px] bg-[#F5F6F4] px-3 py-2.5">
                            <div className="text-[10px] text-[#989D98]">
                              الإجمالي
                            </div>

                            <div dir="ltr" className="mt-1 text-right text-[16px] font-medium text-[#343834]">
                              {fmt(orderTotal(order))}
                              <span className="mr-1 text-[10px] font-normal text-[#8F948F]">
                                {currencySymbol(order)}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-[9px] bg-[#F5F6F4] px-3 py-2.5">
                            <div className="text-[10px] text-[#989D98]">
                              المنتجات
                            </div>

                            <div className="mt-1 text-[14px] font-medium text-[#343834]">
                              {fmt(itemsCount(order))} قطعة
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <PaymentBadge paymentMethod={order.payment_method} />

                          <span className="inline-flex h-[28px] items-center gap-1.5 rounded-full border border-[#E5E7E3] bg-[#F8F9F7] px-2.5 text-[10px] text-[#7B807B]">
                            <MapPin className="h-3 w-3" />
                            {orderLocation(order)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#9A9F9A]">
                          <CalendarDays className="h-3 w-3" />
                          <span>{date.date}</span>
                          <span>·</span>
                          <span>{date.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 border-t border-[#ECEDE9] bg-[#F8F9F7] p-2.5">
                    <Select value={order.status} onValueChange={(value) => void updateStatus(order.id, value)} disabled={updating}>
                      <SelectTrigger className="h-[34px] min-w-0 flex-1 rounded-[8px] border-[#DFE2DD] bg-white px-2.5 text-[11px] shadow-none">
                        {updating ? (
                          <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
                        ) : null}

                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button size="icon" variant="outline" onClick={() => setSelectedOrder(order)} className="h-[34px] w-[34px] rounded-[8px] border-[#DFE2DD] bg-white text-[#677067] shadow-none">
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="outline" onClick={() => openWhatsApp(order)} className="h-[34px] w-[34px] rounded-[8px] border-[#D7E6DC] bg-white text-[#4D9568] shadow-none">
                      <MessageCircle className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="outline" onClick={() => setConfirmDelete({ id: order.id })} className="h-[34px] w-[34px] rounded-[8px] border-[#EEDADA] bg-white text-[#B76161] shadow-none">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })
          )}

          <div className="rounded-[13px] border border-[#E7E8E4] bg-[#FBFBFA] px-2">
            <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        </section>

        {/* =====================================================
            DESKTOP TABLE
        ====================================================== */}

        <section className="hidden overflow-hidden rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] md:block">
          <div className="flex items-center justify-between border-b border-[#ECEDE9] px-4 py-3">
            <div>
              <h2 className="text-[13px] font-medium text-[#555A55]">
                قائمة الطلبات
              </h2>

              <p className="mt-0.5 text-[10px] text-[#A0A4A0]">
                عرض {firstResult} - {lastResult} من أصل {fmt(total)}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-1.5 text-[10px] text-[#929792]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                تحديث...
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">

              {/* TABLE HEAD */}

              <thead>
                <tr className="h-[44px] border-b border-[#ECEDE9] bg-[#F7F8F6] text-[11px] text-[#929792]">
                  <th className="w-[45px] px-3 text-center font-normal">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="h-4 w-4 border-[#AEB4AE] data-[state=checked]:border-[#59634D] data-[state=checked]:bg-[#59634D]" />
                  </th>

                  <th className="px-3 text-right font-normal">
                    الطلب
                  </th>

                  <th className="px-3 text-right font-normal">
                    العميل
                  </th>

                  <th className="px-3 text-right font-normal">
                    الموقع
                  </th>

                  <th className="px-3 text-right font-normal">
                    القيمة
                  </th>

                  <th className="px-3 text-right font-normal">
                    الدفع
                  </th>

                  <th className="px-3 text-right font-normal">
                    الحالة
                  </th>

                  <th className="px-3 text-right font-normal">
                    التاريخ
                  </th>

                  <th className="w-[120px] px-3 text-center font-normal">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY */}

              <tbody>
                {isLoading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-[260px] text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#7D8579]" />
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyOrders />
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const date = formatOrderDate(order.created_at);

                    const updating =
                      updateStatusMutation.isPending &&
                      updatingOrderId === order.id;

                    return (
                      <tr key={order.id} className={cn("h-[70px] border-b border-[#F0F1EE] transition-colors last:border-b-0 hover:bg-[#F8F9F7]", selected.has(order.id) && "bg-[#F3F5F1]")}>
                        <td className="px-3 text-center">
                          <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} className="h-4 w-4 border-[#AEB4AE] data-[state=checked]:border-[#59634D] data-[state=checked]:bg-[#59634D]" />
                        </td>

                        {/* ORDER */}

                        <td className="px-3">
                          <button type="button" onClick={() => setSelectedOrder(order)} className="text-right">
                            <div dir="ltr" className="text-right text-[12px] font-medium text-[#4A504A]">
                              #{order.order_number}
                            </div>

                            <div className="mt-1 text-[10px] text-[#9CA19C]">
                              {fmt(itemsCount(order))} قطعة
                            </div>
                          </button>
                        </td>

                        {/* CUSTOMER */}

                        <td className="px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EEF0EC] text-[11px] font-medium text-[#65705F]">
                              {(order.customer_name || "?").charAt(0)}
                            </div>

                            <div className="min-w-0">
                              <div className="max-w-[170px] truncate text-[13px] font-medium text-[#414641]">
                                {order.customer_name || "عميل"}
                              </div>

                              <div dir="ltr" className="mt-0.5 max-w-[170px] truncate text-right text-[10px] text-[#989D98]">
                                {order.customer_phone}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* LOCATION */}

                        <td className="px-3">
                          <div className="flex max-w-[160px] items-center gap-1.5 text-[11px] text-[#737873]">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#999E99]" strokeWidth={1.5} />
                            <span className="truncate">
                              {orderLocation(order)}
                            </span>
                          </div>
                        </td>

                        {/* VALUE */}

                        <td className="px-3">
                          <div dir="ltr" className="text-right text-[13px] font-medium text-[#353935]">
                            {fmt(orderTotal(order))}

                            <span className="mr-1 text-[10px] font-normal text-[#8F948F]">
                              {currencySymbol(order)}
                            </span>
                          </div>

                          <div className="mt-0.5 text-[10px] text-[#A0A4A0]">
                            {currencyName(order)}
                          </div>
                        </td>

                        {/* PAYMENT */}

                        <td className="px-3">
                          <PaymentBadge paymentMethod={order.payment_method} />
                        </td>

                        {/* STATUS */}

                        <td className="px-3">
                          <Select value={order.status} onValueChange={(value) => void updateStatus(order.id, value)} disabled={updating}>
                            <SelectTrigger className="h-[34px] w-[142px] rounded-[8px] border-[#E1E3DF] bg-white px-2.5 text-[11px] shadow-none">
                              {updating ? (
                                <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
                              ) : null}

                              <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* DATE */}

                        <td className="px-3">
                          <div className="text-[11px] font-medium text-[#666B66]">
                            {date.date}
                          </div>

                          <div className="mt-0.5 text-[10px] text-[#9A9F9A]">
                            {date.time}
                          </div>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" onClick={() => setSelectedOrder(order)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E3E5E1] bg-white text-[#747B72] transition hover:bg-[#EEF0EC] hover:text-[#4F584D]">
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </button>

                            <button type="button" onClick={() => openWhatsApp(order)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#DDE9E1] bg-white text-[#57936B] transition hover:bg-[#EFF7F1]">
                              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                            </button>

                            <button type="button" onClick={() => setConfirmDelete({ id: order.id })} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#EEDDDD] bg-white text-[#B96767] transition hover:bg-[#FCF0F0]">
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#ECEDE9] px-3">
            <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        </section>
      </div>

      {/* =====================================================
          ORDER DETAILS DRAWER
      ====================================================== */}

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#222722]/35 backdrop-blur-[2px]" onClick={() => setSelectedOrder(null)}>
          <aside className="h-full w-full overflow-y-auto border-r border-[#E4E6E2] bg-[#F6F7F5] shadow-[-20px_0_50px_rgba(25,30,25,0.08)] sm:max-w-[520px]" onClick={(event) => event.stopPropagation()}>

            {/* DRAWER HEADER */}

            <div className="sticky top-0 z-20 border-b border-[#E6E8E4] bg-[#FBFBFA]/95 px-4 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] text-[#969B96]">
                    تفاصيل الطلب
                  </div>

                  <h2 dir="ltr" className="mt-1 text-right text-[19px] font-medium text-[#303430]">
                    #{selectedOrder.order_number}
                  </h2>

                  <div className="mt-2">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>

                <button type="button" onClick={() => setSelectedOrder(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E4E0] bg-white text-[#707770]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 p-3">

              {/* STATUS */}

              <section className="rounded-[13px] border border-[#E5E7E3] bg-[#FBFBFA] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-[#555A55]">
                      حالة الطلب
                    </div>

                    <div className="mt-1 text-[10px] text-[#9A9F9A]">
                      يمكنك تغيير حالة الطلب مباشرة.
                    </div>
                  </div>

                  <Select value={selectedOrder.status} onValueChange={(value) => void updateStatus(selectedOrder.id, value)}>
                    <SelectTrigger className="h-[36px] w-[155px] rounded-[8px] border-[#DFE2DD] bg-[#F7F8F6] text-[11px] shadow-none">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* CUSTOMER */}

              <section className="rounded-[13px] border border-[#E5E7E3] bg-[#FBFBFA] p-3.5">
                <h3 className="text-[13px] font-medium text-[#555A55]">
                  بيانات العميل
                </h3>

                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#EFF1ED] text-[12px] font-medium text-[#687263]">
                      {(selectedOrder.customer_name || "?").charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[#3F443F]">
                        {selectedOrder.customer_name}
                      </div>

                      <div className="mt-0.5 text-[10px] text-[#999E99]">
                        اسم العميل
                      </div>
                    </div>
                  </div>

                  {/* PHONE */}

                  <div className="flex items-center gap-3 border-t border-[#EFF0ED] pt-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#EDF5F0] text-[#55916A]">
                      <Phone className="h-4 w-4" strokeWidth={1.5} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div dir="ltr" className="text-right text-[12px] font-medium text-[#4A4F4A]">
                        {selectedOrder.customer_phone}
                      </div>

                      <div className="mt-0.5 text-[10px] text-[#999E99]">
                        رقم الهاتف
                      </div>
                    </div>

                    <button type="button" onClick={() => openWhatsApp(selectedOrder)} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#DCE9E0] bg-[#F5FAF6] px-3 text-[10px] text-[#528F67]">
                      <MessageCircle className="h-3.5 w-3.5" />
                      واتساب
                    </button>
                  </div>

                  {/* ADDRESS */}

                  {selectedOrder.customer_address ||
                  selectedOrder.customer_city ||
                  selectedOrder.customer_region ? (
                    <div className="flex items-start gap-3 border-t border-[#EFF0ED] pt-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#F0F3F2] text-[#718079]">
                        <MapPin className="h-4 w-4" strokeWidth={1.5} />
                      </div>

                      <div className="min-w-0">
                        <div className="text-[12px] leading-6 text-[#4D524D]">
                          {selectedOrder.customer_address ||
                            orderLocation(selectedOrder)}
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {selectedOrder.customer_city ? (
                            <span className="rounded-full bg-[#F2F3F1] px-2.5 py-1 text-[10px] text-[#777D77]">
                              {selectedOrder.customer_city}
                            </span>
                          ) : null}

                          {selectedOrder.customer_region ? (
                            <span className="rounded-full bg-[#F2F3F1] px-2.5 py-1 text-[10px] text-[#777D77]">
                              {selectedOrder.customer_region}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* NOTES */}

                  {selectedOrder.customer_notes ? (
                    <div className="border-t border-[#EFF0ED] pt-2.5">
                      <div className="text-[10px] text-[#999E99]">
                        ملاحظات العميل
                      </div>

                      <div className="mt-1.5 rounded-[9px] bg-[#F6F7F5] p-3 text-[11px] leading-6 text-[#606560]">
                        {selectedOrder.customer_notes}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* PRODUCTS */}

              <section className="rounded-[13px] border border-[#E5E7E3] bg-[#FBFBFA] p-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-[#555A55]">
                    <Package className="h-4 w-4" />
                    المنتجات
                  </h3>

                  <span className="text-[10px] text-[#999E99]">
                    {fmt(itemsCount(selectedOrder))} قطعة
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {itemsOf(selectedOrder).map(
                    (item, index) => {
                      const image =
                        item.product_image ||
                        item.image;

                      const quantity = Math.max(
                        1,
                        Number(item.quantity || 1),
                      );

                      const price = Number(
                        item.price || 0,
                      );

                      return (
                        <div key={`${item.product_id || index}-${index}`} className="flex gap-3 rounded-[10px] border border-[#ECEDE9] bg-[#F8F9F7] p-2.5">
                          <div className="h-[62px] w-[62px] shrink-0 overflow-hidden rounded-[9px] bg-[#EEEFECD]">
                            {image ? (
                              <img src={image} alt={item.product_name || item.name || "منتج"} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-5 w-5 text-[#969C93]" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-medium text-[#454A45]">
                              {item.product_name ||
                                item.name ||
                                "منتج"}
                            </div>

                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.selected_color ? (
                                <span className="rounded-full border border-[#E3E5E1] bg-white px-2.5 py-1 text-[10px] text-[#757A75]">
                                  اللون: {item.selected_color}
                                </span>
                              ) : null}

                              {item.selected_size ? (
                                <span className="rounded-full border border-[#E3E5E1] bg-white px-2.5 py-1 text-[10px] text-[#757A75]">
                                  المقاس: {item.selected_size}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2.5 flex items-end justify-between gap-2">
                              <span dir="ltr" className="text-right text-[11px] text-[#858A85]">
                                {quantity} × {fmt(price)}{" "}
                                {currencySymbol(
                                  selectedOrder,
                                )}
                              </span>

                              <span dir="ltr" className="text-[13px] font-medium text-[#3D423D]">
                                {fmt(quantity * price)}{" "}
                                {currencySymbol(
                                  selectedOrder,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              {/* PAYMENT DETAILS */}

              <section className="rounded-[13px] border border-[#E5E7E3] bg-[#FBFBFA] p-3.5">
                <h3 className="text-[13px] font-medium text-[#555A55]">
                  تفاصيل المبلغ
                </h3>

                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#858A85]">
                      المجموع الفرعي
                    </span>

                    <span dir="ltr" className="font-medium text-[#474C47]">
                      {fmt(
                        Number(
                          selectedOrder.subtotal ||
                            0,
                        ),
                      )}{" "}
                      {currencySymbol(
                        selectedOrder,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#858A85]">
                      رسوم التوصيل
                    </span>

                    <span dir="ltr" className="font-medium text-[#474C47]">
                      {fmt(
                        Number(
                          selectedOrder.delivery_fee ||
                            0,
                        ),
                      )}{" "}
                      {currencySymbol(
                        selectedOrder,
                      )}
                    </span>
                  </div>

                  {Number(
                    selectedOrder.discount_amount || 0,
                  ) > 0 ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-[#538C66]">
                        الخصم

                        {selectedOrder.coupon_code ? (
                          <Badge variant="outline" className="h-[22px] rounded-full border-[#D8E7DC] bg-[#F3F8F4] px-2 text-[9px] font-normal text-[#538C66]">
                            {selectedOrder.coupon_code}
                          </Badge>
                        ) : null}
                      </span>

                      <span dir="ltr" className="font-medium text-[#538C66]">
                        -
                        {fmt(
                          Number(
                            selectedOrder.discount_amount ||
                              0,
                          ),
                        )}{" "}
                        {currencySymbol(
                          selectedOrder,
                        )}
                      </span>
                    </div>
                  ) : null}

                  <div className="border-t border-[#E8EAE6] pt-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[12px] font-medium text-[#4D524D]">
                          الإجمالي
                        </div>

                        <div className="mt-0.5 text-[10px] text-[#9A9F9A]">
                          {currencyName(
                            selectedOrder,
                          )}
                        </div>
                      </div>

                      <div dir="ltr" className="text-[21px] font-medium tracking-[-0.04em] text-[#303430]">
                        {fmt(
                          orderTotal(
                            selectedOrder,
                          ),
                        )}

                        <span className="mr-1 text-[11px] font-normal text-[#828782]">
                          {currencySymbol(
                            selectedOrder,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* PAYMENT / DATE */}

              <section className="rounded-[13px] border border-[#E5E7E3] bg-[#FBFBFA] p-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[9px] bg-[#F6F7F5] p-3">
                    <div className="text-[10px] text-[#999E99]">
                      طريقة الدفع
                    </div>

                    <div className="mt-1 text-[12px] font-medium text-[#4D524D]">
                      {paymentLabel(
                        selectedOrder.payment_method,
                      )}
                    </div>
                  </div>

                  <div className="rounded-[9px] bg-[#F6F7F5] p-3">
                    <div className="text-[10px] text-[#999E99]">
                      تاريخ الطلب
                    </div>

                    <div className="mt-1 text-[12px] font-medium text-[#4D524D]">
                      {
                        formatOrderDate(
                          selectedOrder.created_at,
                        ).date
                      }
                    </div>

                    <div className="mt-0.5 text-[10px] text-[#999E99]">
                      {
                        formatOrderDate(
                          selectedOrder.created_at,
                        ).time
                      }
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {/* =====================================================
          DELETE CONFIRMATION
      ====================================================== */}

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent dir="rtl" className="rounded-[14px] border-[#E4E6E2] bg-[#FBFBFA]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-medium text-[#353A35]">
              تأكيد الحذف
            </AlertDialogTitle>

            <AlertDialogDescription className="text-[12px] leading-6 text-[#858A85]">
              {confirmDelete?.bulk
                ? `سيتم حذف ${selected.size} طلب نهائيًا من النظام. لا يمكن التراجع عن هذه العملية.`
                : "سيتم حذف هذا الطلب نهائيًا من النظام. لا يمكن التراجع عن هذه العملية."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-10 rounded-[9px] border-[#E1E3DF] bg-white px-4 text-[12px] font-normal">
              إلغاء
            </AlertDialogCancel>

            <AlertDialogAction className="h-10 rounded-[9px] bg-[#B76060] px-4 text-[12px] font-normal text-white hover:bg-[#A75555]" onClick={() => {
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
              {deleteOrderMutation.isPending ||
              deleteOrdersMutation.isPending ? (
                <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="ml-1.5 h-4 w-4" />
              )}

              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOrdersPage;