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
    return <span className="inline-flex h-[27px] items-center rounded-[8px] border border-[#E3E7EC] bg-[#F7F9FB] px-[8px] text-[8px] font-semibold text-[#727A85]">{status}</span>;
  }

  const Icon = info.icon;

  return (
    <span className={cn("inline-flex h-[27px] items-center gap-[5px] whitespace-nowrap rounded-[8px] border px-[8px] text-[8px] font-semibold", info.className)}>
      <Icon className="h-[10px] w-[10px]" strokeWidth={1.8} />
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
    <span className={cn("inline-flex h-[27px] items-center gap-[5px] whitespace-nowrap rounded-[8px] border px-[8px] text-[8px] font-semibold", cod ? "border-[#EFE2C8] bg-[#FFF8EC] text-[#9A7133]" : "border-[#D8E8EC] bg-[#F1F8FA] text-[#557E88]")}>
      <CircleDollarSign className="h-[10px] w-[10px]" strokeWidth={1.7} />
      {paymentLabel(paymentMethod)}
    </span>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyOrders = () => {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[#F1EFFF] text-[#675CBA]">
        <ShoppingCart className="h-[19px] w-[19px]" strokeWidth={1.6} />
      </div>

      <h3 className="mt-3 text-[12px] font-semibold text-[#4A515B]">لا توجد طلبات</h3>
      <p className="mt-[5px] max-w-[260px] text-[8.5px] leading-5 text-[#9AA1AB]">لم نجد طلبات مطابقة للبحث أو الفلاتر الحالية.</p>
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
    <div dir="rtl" className="w-full">
      <div className="w-full space-y-4">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="flex flex-col gap-4 border-b border-[#E4E8ED] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-[7px] flex items-center gap-[7px]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#D06A5E]" />
              <span className="text-[7.5px] font-bold tracking-[0.07em] text-[#989FA9]">ORDER MANAGEMENT</span>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <h1 className="text-[23px] font-bold leading-none tracking-[-0.5px] text-[#20252E] md:text-[25px]">الطلبات</h1>
              <span className="mb-[1px] rounded-[7px] bg-[#FFF0ED] px-[7px] py-[4px] text-[7px] font-semibold text-[#C45E53]">{fmt(total)} طلب</span>
            </div>

            <p className="mt-[7px] max-w-[620px] text-[10px] font-medium leading-5 text-[#8F97A2]">إدارة الطلبات ومتابعة حالاتها والتواصل مع العملاء من مكان واحد.</p>
          </div>

          <div className="flex items-center gap-[7px]">
            <Link to="/admin/reports/finance" className="flex h-[38px] items-center gap-[7px] rounded-[10px] border border-[#E2E6EB] bg-white px-3 text-[9px] font-semibold text-[#5F6772] transition-colors hover:bg-[#F8FAFC]">
              <TrendingUp className="h-[12px] w-[12px] text-[#57906A]" strokeWidth={1.8} />
              الإيرادات
            </Link>

            <Link to="/admin/reports" className="flex h-[38px] items-center gap-[7px] rounded-[10px] border border-[#E2E6EB] bg-white px-3 text-[9px] font-semibold text-[#5F6772] transition-colors hover:bg-[#F8FAFC]">
              <BarChart3 className="h-[12px] w-[12px] text-[#675CBA]" strokeWidth={1.8} />
              التقارير
            </Link>
          </div>
        </header>

        {/* =====================================================
            STATS
        ====================================================== */}

        <section className="grid grid-cols-2 gap-[9px] xl:grid-cols-4">
          <article className="relative min-h-[112px] overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#675CBA]" />
            <div className="flex items-start justify-between">
              <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#EEEBFF] text-[#675CBA]">
                <ShoppingCart className="h-[14px] w-[14px]" strokeWidth={1.8} />
              </div>
              <span className="text-[7px] font-medium text-[#9BA2AC]">حسب الفلاتر</span>
            </div>
            <p className="mt-3 text-[8.5px] font-medium text-[#858D98]">إجمالي النتائج</p>
            <div dir="ltr" className="mt-[5px] text-right text-[21px] font-semibold leading-none tracking-[-0.04em] text-[#2B313B]">{fmt(total)}</div>
          </article>

          <article className="relative min-h-[112px] overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#5680CF]" />
            <div className="flex items-start justify-between">
              <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#EDF4FF] text-[#5680CF]">
                <Package className="h-[14px] w-[14px]" strokeWidth={1.8} />
              </div>
              <span className="text-[7px] font-medium text-[#9BA2AC]">{firstResult}–{lastResult}</span>
            </div>
            <p className="mt-3 text-[8.5px] font-medium text-[#858D98]">طلبات الصفحة</p>
            <div dir="ltr" className="mt-[5px] text-right text-[21px] font-semibold leading-none tracking-[-0.04em] text-[#2B313B]">{fmt(orders.length)}</div>
          </article>

          <article className="relative min-h-[112px] overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#C38838]" />
            <div className="flex items-start justify-between">
              <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#FFF5E5] text-[#B98031]">
                <Clock3 className="h-[14px] w-[14px]" strokeWidth={1.8} />
              </div>
              <span className="rounded-[6px] bg-[#FFF5E5] px-[6px] py-[3px] text-[6.5px] font-semibold text-[#A9752F]">تحتاج متابعة</span>
            </div>
            <p className="mt-3 text-[8.5px] font-medium text-[#858D98]">قيد الانتظار</p>
            <div dir="ltr" className="mt-[5px] text-right text-[21px] font-semibold leading-none tracking-[-0.04em] text-[#B47B2C]">{fmt(pageStats.pending)}</div>
          </article>

          <article className="relative min-h-[112px] overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#629067]" />
            <div className="flex items-start justify-between">
              <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#EAF7EE] text-[#57906A]">
                <PackageCheck className="h-[14px] w-[14px]" strokeWidth={1.8} />
              </div>
              <span className="rounded-[6px] bg-[#EAF7EE] px-[6px] py-[3px] text-[6.5px] font-semibold text-[#57906A]">مكتملة</span>
            </div>
            <p className="mt-3 text-[8.5px] font-medium text-[#858D98]">تم توصيلها</p>
            <div dir="ltr" className="mt-[5px] text-right text-[21px] font-semibold leading-none tracking-[-0.04em] text-[#57906A]">{fmt(pageStats.delivered)}</div>
          </article>
        </section>

        {/* =====================================================
            FILTERS
        ====================================================== */}

        <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[10px]">
          <div className="flex flex-col gap-[8px] lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-[13px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#9AA2AC]" strokeWidth={1.7} />

              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="ابحث برقم الطلب، اسم العميل أو رقم الهاتف..." className="h-[40px] rounded-[10px] border-[#E4E8ED] bg-[#F8FAFC] pr-[38px] pl-[38px] text-[10.5px] font-medium text-[#424A55] shadow-none placeholder:text-[#A1A8B2] focus-visible:border-[#D8DCE8] focus-visible:bg-white focus-visible:ring-0" />

              {searchInput ? (
                <button type="button" onClick={() => setSearchInput("")} className="absolute left-[8px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[7px] text-[#9AA1AB] transition-colors hover:bg-[#EDF0F4] hover:text-[#606873]">
                  <X className="h-[12px] w-[12px]" />
                </button>
              ) : null}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-[40px] w-full rounded-[10px] border-[#E4E8ED] bg-[#F8FAFC] px-3 text-[10px] font-medium text-[#5B6470] shadow-none focus:ring-0 lg:w-[170px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-[40px] w-full rounded-[10px] border-[#E4E8ED] bg-[#F8FAFC] px-3 text-[10px] font-medium text-[#5B6470] shadow-none focus:ring-0 lg:w-[145px]">
                <SelectValue placeholder="الدولة" />
              </SelectTrigger>

              <SelectContent>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters ? (
              <Button variant="ghost" onClick={clearFilters} className="h-[40px] rounded-[10px] px-3 text-[9px] font-semibold text-[#7F8791] hover:bg-[#F7F9FB] hover:text-[#C15F56]">
                <X className="ml-[5px] h-[12px] w-[12px]" />
                مسح
              </Button>
            ) : null}
          </div>

          {selected.size > 0 ? (
            <div className="mt-[9px] flex flex-col gap-3 rounded-[12px] border border-[#DDD8F4] bg-[#F8F6FF] p-[10px] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-[9px]">
                <div className="flex h-[30px] min-w-[30px] items-center justify-center rounded-[9px] bg-[#675CBA] px-[8px] text-[10px] font-bold text-white">{selected.size}</div>

                <div>
                  <p className="text-[9.5px] font-semibold text-[#4D466E]">تم تحديد {selected.size} طلب</p>
                  <p className="mt-[2px] text-[7px] text-[#8E87A9]">اختر إجراءً لتطبيقه على الطلبات المحددة.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-[6px]">
                <Select value={bulkStatus} onValueChange={(value) => { setBulkStatus(value); void bulkUpdateStatus(value); }}>
                  <SelectTrigger className="h-[34px] w-[150px] rounded-[9px] border-[#DDD8EE] bg-white text-[9px] font-medium shadow-none focus:ring-0">
                    <SelectValue placeholder="تغيير الحالة" />
                  </SelectTrigger>

                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => setSelected(new Set())} className="h-[34px] rounded-[9px] border-[#E0E3E8] bg-white px-3 text-[9px] font-semibold text-[#69717C] shadow-none hover:bg-[#F8FAFC]">إلغاء التحديد</Button>

                <Button variant="outline" onClick={() => setConfirmDelete({ bulk: true })} className="h-[34px] rounded-[9px] border-[#F0D8D8] bg-[#FFF8F8] px-3 text-[9px] font-semibold text-[#BE6262] shadow-none hover:bg-[#FFF0F0] hover:text-[#B35656]">
                  <Trash2 className="ml-[5px] h-[12px] w-[12px]" />
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
            <div className="flex h-[220px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-[#675CBA]" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-[14px] border border-[#E5E9EF] bg-white">
              <EmptyOrders />
            </div>
          ) : (
            orders.map((order) => {
              const date = formatOrderDate(order.created_at);

              const updating =
                updateStatusMutation.isPending &&
                updatingOrderId === order.id;

              return (
                <article key={order.id} className={cn("overflow-hidden rounded-[15px] border bg-white transition-colors", selected.has(order.id) ? "border-[#BDB6EB] ring-1 ring-[#E5E1FF]" : "border-[#E5E9EF]")}>
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} className="mt-1 h-4 w-4 border-[#AEB4AE] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div dir="ltr" className="w-fit text-right text-[10px] font-semibold text-[#675CBA]">
                              #{order.order_number}
                            </div>

                            <div className="mt-1 truncate text-[13px] font-semibold text-[#343A44]">
                              {order.customer_name || "عميل"}
                            </div>
                          </div>

                          <StatusBadge status={order.status} />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-[9px] bg-[#F7F9FB] px-3 py-2.5">
                            <div className="text-[7.5px] text-[#989FA9]">
                              الإجمالي
                            </div>

                            <div dir="ltr" className="mt-1 text-right text-[16px] font-medium text-[#343834]">
                              {fmt(orderTotal(order))}
                              <span className="mr-1 text-[10px] font-normal text-[#8F948F]">
                                {currencySymbol(order)}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-[9px] bg-[#F7F9FB] px-3 py-2.5">
                            <div className="text-[7.5px] text-[#989FA9]">
                              المنتجات
                            </div>

                            <div className="mt-1 text-[14px] font-medium text-[#343834]">
                              {fmt(itemsCount(order))} قطعة
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <PaymentBadge paymentMethod={order.payment_method} />

                          <span className="inline-flex h-[28px] items-center gap-1.5 rounded-full border border-[#E5E7E3] bg-[#FAFBFC] px-2.5 text-[10px] text-[#7B807B]">
                            <MapPin className="h-3 w-3" />
                            {orderLocation(order)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#989FA9]">
                          <CalendarDays className="h-3 w-3" />
                          <span>{date.date}</span>
                          <span>·</span>
                          <span>{date.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 border-t border-[#EDF0F3] bg-[#FAFBFC] p-2.5">
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

          <div className="rounded-[13px] border border-[#E5E9EF] bg-white px-2">
            <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        </section>

        {/* =====================================================
            DESKTOP TABLE
        ====================================================== */}

        <section className="hidden overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white md:block">
          <div className="flex items-center justify-between border-b border-[#EDF0F3] px-4 py-3">
            <div>
              <h2 className="text-[13px] font-medium text-[#4B535E]">
                قائمة الطلبات
              </h2>

              <p className="mt-[3px] text-[7.5px] text-[#9AA1AB]">
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
                <tr className="h-[42px] border-b border-[#EDF0F3] bg-[#FAFBFC] text-[8px] font-semibold text-[#929AA5]">
                  <th className="w-[45px] px-3 text-center font-semibold">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="h-4 w-4 border-[#AEB4AE] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                  </th>

                  <th className="px-3 text-right font-semibold">
                    الطلب
                  </th>

                  <th className="px-3 text-right font-semibold">
                    العميل
                  </th>

                  <th className="px-3 text-right font-semibold">
                    الموقع
                  </th>

                  <th className="px-3 text-right font-semibold">
                    القيمة
                  </th>

                  <th className="px-3 text-right font-semibold">
                    الدفع
                  </th>

                  <th className="px-3 text-right font-semibold">
                    الحالة
                  </th>

                  <th className="px-3 text-right font-semibold">
                    التاريخ
                  </th>

                  <th className="w-[120px] px-3 text-center font-semibold">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY */}

              <tbody>
                {isLoading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-[260px] text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#675CBA]" />
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
                      <tr key={order.id} className={cn("h-[66px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FAFBFC]", selected.has(order.id) && "bg-[#F7F5FF]")}>
                        <td className="px-3 text-center">
                          <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} className="h-4 w-4 border-[#AEB4AE] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                        </td>

                        {/* ORDER */}

                        <td className="px-3">
                          <button type="button" onClick={() => setSelectedOrder(order)} className="text-right">
                            <div dir="ltr" className="text-right text-[9.5px] font-semibold text-[#675CBA]">
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
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EEEBFF] text-[11px] font-semibold text-[#675CBA]">
                              {(order.customer_name || "?").charAt(0)}
                            </div>

                            <div className="min-w-0">
                              <div className="max-w-[170px] truncate text-[10.5px] font-semibold text-[#414852]">
                                {order.customer_name || "عميل"}
                              </div>

                              <div dir="ltr" className="mt-0.5 max-w-[170px] truncate text-right text-[7.5px] text-[#989FA9]">
                                {order.customer_phone}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* LOCATION */}

                        <td className="px-3">
                          <div className="flex max-w-[160px] items-center gap-1.5 text-[8.5px] text-[#737B86]">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#989FA9]" strokeWidth={1.5} />
                            <span className="truncate">
                              {orderLocation(order)}
                            </span>
                          </div>
                        </td>

                        {/* VALUE */}

                        <td className="px-3">
                          <div dir="ltr" className="text-right text-[10.5px] font-semibold text-[#3C434D]">
                            {fmt(orderTotal(order))}

                            <span className="mr-1 text-[10px] font-normal text-[#8F948F]">
                              {currencySymbol(order)}
                            </span>
                          </div>

                          <div className="mt-[3px] text-[7.5px] text-[#9AA1AB]">
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
                          <div className="text-[9px] font-medium text-[#626A75]">
                            {date.date}
                          </div>

                          <div className="mt-0.5 text-[10px] text-[#989FA9]">
                            {date.time}
                          </div>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" onClick={() => setSelectedOrder(order)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#7A828D] transition hover:bg-[#F3F1FF] hover:text-[#675CBA]">
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </button>

                            <button type="button" onClick={() => openWhatsApp(order)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D8E9DF] bg-white text-[#4F9368] transition hover:bg-[#EFF7F1]">
                              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                            </button>

                            <button type="button" onClick={() => setConfirmDelete({ id: order.id })} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#F0DADA] bg-white text-[#BE6464] transition hover:bg-[#FCF0F0]">
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

          <div className="border-t border-[#EDF0F3] px-3">
            <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        </section>
      </div>

      {/* =====================================================
          ORDER DETAILS DRAWER
      ====================================================== */}

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1F2430]/30 backdrop-blur-[2px]" onClick={() => setSelectedOrder(null)}>
          <aside className="h-full w-full overflow-y-auto border-r border-[#E4E8ED] bg-[#F6F8FA] shadow-[-22px_0_60px_rgba(30,36,50,0.10)] sm:max-w-[540px]" onClick={(event) => event.stopPropagation()}>

            {/* DRAWER HEADER */}

            <div className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white/95 px-4 py-4 backdrop-blur">
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

                <button type="button" onClick={() => setSelectedOrder(null)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E3E7EC] bg-white text-[#737B86] transition-colors hover:bg-[#F7F9FB] hover:text-[#4D5560]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 p-3">

              {/* STATUS */}

              <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-[#4B535E]">
                      حالة الطلب
                    </div>

                    <div className="mt-1 text-[10px] text-[#989FA9]">
                      يمكنك تغيير حالة الطلب مباشرة.
                    </div>
                  </div>

                  <Select value={selectedOrder.status} onValueChange={(value) => void updateStatus(selectedOrder.id, value)}>
                    <SelectTrigger className="h-[36px] w-[155px] rounded-[8px] border-[#DFE2DD] bg-[#F8FAFC] text-[11px] shadow-none">
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

              <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
                <h3 className="text-[13px] font-medium text-[#4B535E]">
                  بيانات العميل
                </h3>

                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[12px] font-medium text-[#675CBA]">
                      {(selectedOrder.customer_name || "?").charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[#3F443F]">
                        {selectedOrder.customer_name}
                      </div>

                      <div className="mt-0.5 text-[10px] text-[#989FA9]">
                        اسم العميل
                      </div>
                    </div>
                  </div>

                  {/* PHONE */}

                  <div className="flex items-center gap-3 border-t border-[#EEF1F4] pt-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#EAF7EE] text-[#57906A]">
                      <Phone className="h-4 w-4" strokeWidth={1.5} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div dir="ltr" className="text-right text-[12px] font-medium text-[#4A4F4A]">
                        {selectedOrder.customer_phone}
                      </div>

                      <div className="mt-0.5 text-[10px] text-[#989FA9]">
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
                    <div className="flex items-start gap-3 border-t border-[#EEF1F4] pt-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#EEF5F7] text-[#718079]">
                        <MapPin className="h-4 w-4" strokeWidth={1.5} />
                      </div>

                      <div className="min-w-0">
                        <div className="text-[12px] leading-6 text-[#4D524D]">
                          {selectedOrder.customer_address ||
                            orderLocation(selectedOrder)}
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {selectedOrder.customer_city ? (
                            <span className="rounded-[7px] bg-[#F4F6F8] px-2.5 py-1 text-[10px] text-[#777D77]">
                              {selectedOrder.customer_city}
                            </span>
                          ) : null}

                          {selectedOrder.customer_region ? (
                            <span className="rounded-[7px] bg-[#F4F6F8] px-2.5 py-1 text-[10px] text-[#777D77]">
                              {selectedOrder.customer_region}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* NOTES */}

                  {selectedOrder.customer_notes ? (
                    <div className="border-t border-[#EEF1F4] pt-2.5">
                      <div className="text-[10px] text-[#989FA9]">
                        ملاحظات العميل
                      </div>

                      <div className="mt-1.5 rounded-[9px] bg-[#F7F9FB] p-3 text-[11px] leading-6 text-[#606560]">
                        {selectedOrder.customer_notes}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* PRODUCTS */}

              <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-[#4B535E]">
                    <Package className="h-4 w-4" />
                    المنتجات
                  </h3>

                  <span className="text-[10px] text-[#989FA9]">
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
                        <div key={`${item.product_id || index}-${index}`} className="flex gap-3 rounded-[10px] border border-[#EDF0F3] bg-[#FAFBFC] p-2.5">
                          <div className="h-[62px] w-[62px] shrink-0 overflow-hidden rounded-[9px] bg-[#F1F3F5]">
                            {image ? (
                              <img src={image} alt={item.product_name || item.name || "منتج"} className="h-full w-full object-contain" />
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
                                <span className="rounded-full border border-[#E3E7EC] bg-white px-2.5 py-1 text-[10px] text-[#757A75]">
                                  اللون: {item.selected_color}
                                </span>
                              ) : null}

                              {item.selected_size ? (
                                <span className="rounded-full border border-[#E3E7EC] bg-white px-2.5 py-1 text-[10px] text-[#757A75]">
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

              <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
                <h3 className="text-[13px] font-medium text-[#4B535E]">
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

                  <div className="border-t border-[#E8EBF0] pt-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[12px] font-medium text-[#4D524D]">
                          الإجمالي
                        </div>

                        <div className="mt-0.5 text-[10px] text-[#989FA9]">
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

              <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[9px] bg-[#F7F9FB] p-3">
                    <div className="text-[10px] text-[#989FA9]">
                      طريقة الدفع
                    </div>

                    <div className="mt-1 text-[12px] font-medium text-[#4D524D]">
                      {paymentLabel(
                        selectedOrder.payment_method,
                      )}
                    </div>
                  </div>

                  <div className="rounded-[9px] bg-[#F7F9FB] p-3">
                    <div className="text-[10px] text-[#989FA9]">
                      تاريخ الطلب
                    </div>

                    <div className="mt-1 text-[12px] font-medium text-[#4D524D]">
                      {
                        formatOrderDate(
                          selectedOrder.created_at,
                        ).date
                      }
                    </div>

                    <div className="mt-0.5 text-[10px] text-[#989FA9]">
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
        <AlertDialogContent dir="rtl" className="rounded-[16px] border-[#E4E8ED] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-[#343A44]">
              تأكيد الحذف
            </AlertDialogTitle>

            <AlertDialogDescription className="text-[11px] leading-6 text-[#858D98]">
              {confirmDelete?.bulk
                ? `سيتم حذف ${selected.size} طلب نهائيًا من النظام. لا يمكن التراجع عن هذه العملية.`
                : "سيتم حذف هذا الطلب نهائيًا من النظام. لا يمكن التراجع عن هذه العملية."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-10 rounded-[10px] border-[#E1E5EA] bg-white px-4 text-[10px] font-semibold text-[#68717C]">
              إلغاء
            </AlertDialogCancel>

            <AlertDialogAction className="h-10 rounded-[10px] bg-[#C76161] px-4 text-[10px] font-semibold text-white hover:bg-[#B85757]" onClick={() => {
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