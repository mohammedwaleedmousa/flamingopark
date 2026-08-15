import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CURRENCY_RATES, convertPrice, getActiveCurrencies, getRateSnapshot } from "@/lib/currency";
import { Check, CircleDollarSign, FilePlus2, Loader2, Package, Plus, ReceiptText, Search, ShoppingBag, Trash2, Truck, UserRound, WalletCards, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceItem {
  key: string;
  product_name: string;
  product_id?: string;
  product_image?: string;
  quantity: number;
  price: number;
}

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  images: string[] | null;
  brand: string | null;
}

interface DeliveryCompany {
  id: string;
  name: string;
  base_fee: number;
  delivery_days: string | null;
}

interface CreatedOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string | null;
  items: InvoiceItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  country: string;
  created_at: string;
  status: string;
  invoice_url?: string | null;
  coupon_code?: string | null;
  discount_amount?: number | null;
  customer_city?: string | null;
  customer_region?: string | null;
  currency_mode?: string | null;
  currency_code?: string | null;
  exchange_rate_snapshot?: number | null;
  total_base?: number | null;
  invoice_review_status?: string;
  invoice_reviewed_at?: string | null;
  invoice_reviewed_by?: string | null;
  invoice_review_note?: string | null;
  delivery_companies?: { name: string } | null;
}

interface NewInvoiceCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreated: (order: CreatedOrder) => void;
}

const SINGLE_COUNTRY = "GLOBAL";

const makeItem = (): InvoiceItem => ({
  key: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `manual-${Date.now()}-${Math.random()}`,
  product_name: "",
  quantity: 1,
  price: 0,
});

const NewInvoiceCreator = ({ open, onClose, onCreated }: NewInvoiceCreatorProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [orderStatus, setOrderStatus] = useState("completed");
  const [currencyMode, setCurrencyMode] = useState("SAR");
  const [deliveryCompanyId, setDeliveryCompanyId] = useState("none");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponCode, setCouponCode] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([makeItem()]);
  const [productSearch, setProductSearch] = useState("");

  const currencies = useMemo(() => {
    const active = getActiveCurrencies();
    return active.length > 0 ? active : Object.entries(CURRENCY_RATES).map(([code, meta]) => ({ code, meta }));
  }, [open]);

  const currencyMeta = CURRENCY_RATES[currencyMode] || CURRENCY_RATES.SAR;
  const currencyRate = getRateSnapshot(currencyMode) || 1;
  const currencySymbol = currencyMeta?.symbol || currencyMode;

  const toDisplay = (baseValue: number) => convertPrice(Number(baseValue || 0), currencyMode);
  const toBase = (displayValue: number) => {
    const value = Number(displayValue || 0);
    return currencyRate > 0 ? value / currencyRate : value;
  };

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["active-delivery-companies-new-invoice"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_companies").select("id,name,base_fee,delivery_days").eq("is_active", true).order("name");

      if (error) throw error;

      return (data || []).map((row) => ({ ...row, base_fee: Number(row.base_fee || 0) })) as DeliveryCompany[];
    },
    staleTime: 60_000,
  });

  const { data: products = [], isFetching: productSearchLoading } = useQuery({
    queryKey: ["products-for-new-invoice", productSearch],
    enabled: open,
    queryFn: async () => {
      const query = productSearch.trim().replace(/[%_,()]/g, " ");

      let request = supabase.from("products").select("id,name,name_ar,price,images,brand").eq("is_active", true).order("created_at", { ascending: false }).limit(24);

      if (query) {
        request = request.or(`name.ilike.%${query}%,name_ar.ilike.%${query}%,brand.ilike.%${query}%`);
      }

      const { data, error } = await request;

      if (error) throw error;

      return (data || []).map((row) => ({ ...row, price: Number(row.price || 0) })) as Product[];
    },
    staleTime: 15_000,
  });

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), 0), [items]);
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerCity("");
    setCustomerRegion("");
    setCustomerNotes("");
    setPaymentMethod("cod");
    setOrderStatus("completed");
    setCurrencyMode("SAR");
    setDeliveryCompanyId("none");
    setDeliveryFee(0);
    setDiscountAmount(0);
    setCouponCode("");
    setItems([makeItem()]);
    setProductSearch("");
  };

  const closeDialog = () => {
    if (isSaving) return;
    resetForm();
    onClose();
  };

  const addProduct = (product: Product) => {
    const existingIndex = items.findIndex((item) => item.product_id === product.id);

    if (existingIndex >= 0) {
      setItems((current) => current.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item));
      toast({ title: "تمت زيادة الكمية", description: product.name_ar || product.name });
      return;
    }

    const nextItem: InvoiceItem = {
      key: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `product-${product.id}-${Date.now()}`,
      product_id: product.id,
      product_name: product.name_ar || product.name,
      product_image: product.images?.find(Boolean) || "",
      quantity: 1,
      price: Number(product.price || 0),
    };

    setItems((current) => {
      if (current.length === 1 && !current[0].product_name.trim() && !current[0].product_id && current[0].price === 0) return [nextItem];
      return [...current, nextItem];
    });
  };

  const addManualItem = () => {
    setItems((current) => [...current, makeItem()]);
  };

  const removeItem = (key: string) => {
    setItems((current) => current.length <= 1 ? [makeItem()] : current.filter((item) => item.key !== key));
  };

  const updateItem = (key: string, patch: Partial<InvoiceItem>) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  };

  const selectDeliveryCompany = (value: string) => {
    setDeliveryCompanyId(value);

    if (value === "none") return;

    const company = deliveryCompanies.find((row) => row.id === value);
    if (company) setDeliveryFee(company.base_fee);
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${datePart}-${random}`;
  };

  const validate = () => {
    if (!customerName.trim()) return "اسم العميل مطلوب.";
    if (!customerPhone.trim()) return "رقم الهاتف مطلوب.";
    if (!customerAddress.trim()) return "عنوان العميل مطلوب.";
    if (items.length === 0) return "أضف بندًا واحدًا على الأقل.";

    const invalidItem = items.find((item) => !item.product_name.trim() || Number(item.quantity) < 1 || Number(item.price) < 0);
    if (invalidItem) return "تحقق من اسم وسعر وكمية جميع البنود.";

    if (deliveryFee < 0) return "رسوم التوصيل لا يمكن أن تكون سالبة.";
    if (discountAmount < 0) return "الخصم لا يمكن أن يكون سالبًا.";
    if (discountAmount > subtotal + deliveryFee) return "الخصم أكبر من قيمة الفاتورة.";

    return null;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      toast({ title: "راجع بيانات الفاتورة", description: validationError, variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const orderNumber = generateOrderNumber();

      const orderItems = items.map((item, index) => ({
        product_id: item.product_id || `manual-${Date.now()}-${index}`,
        product_name: item.product_name.trim(),
        product_image: item.product_image || "",
        quantity: Math.max(1, Math.trunc(Number(item.quantity || 1))),
        price: Number(item.price || 0),
      }));

      const payload = {
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        customer_notes: customerNotes.trim() || null,
        customer_city: customerCity.trim() || null,
        customer_region: customerRegion.trim() || null,
        country: SINGLE_COUNTRY,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        coupon_code: couponCode.trim() || null,
        total,
        total_base: total,
        delivery_company_id: deliveryCompanyId === "none" ? null : deliveryCompanyId,
        payment_method: paymentMethod,
        status: orderStatus,
        currency_mode: currencyMode,
        currency_code: currencyMode,
        exchange_rate_snapshot: currencyRate,
        invoice_review_status: "unreviewed",
        invoice_reviewed_at: null,
        invoice_reviewed_by: null,
        invoice_review_note: null,
      };

      const { data, error } = await supabase.from("orders").insert(payload).select("id,order_number,customer_name,customer_phone,customer_address,customer_notes,items,subtotal,delivery_fee,total,payment_method,country,created_at,status,invoice_url,coupon_code,discount_amount,customer_city,customer_region,currency_mode,currency_code,exchange_rate_snapshot,total_base,invoice_review_status,invoice_reviewed_at,invoice_reviewed_by,invoice_review_note,delivery_companies(name)").single();

      if (error) throw error;

      toast({
        title: "تم إنشاء الفاتورة",
        description: `تم إنشاء ${orderNumber}. ستفتح الآن للمراجعة وحفظ PDF.`,
      });

      const createdOrder = {
        ...(data as any),
        items: Array.isArray((data as any).items) ? (data as any).items : [],
        subtotal: Number((data as any).subtotal || 0),
        delivery_fee: Number((data as any).delivery_fee || 0),
        discount_amount: Number((data as any).discount_amount || 0),
        total: Number((data as any).total || 0),
        exchange_rate_snapshot: Number((data as any).exchange_rate_snapshot || currencyRate),
        total_base: Number((data as any).total_base || total),
      } as CreatedOrder;

      resetForm();
      onCreated(createdOrder);
    } catch (error: any) {
      toast({
        title: "تعذر إنشاء الفاتورة",
        description: error?.message || "حدث خطأ أثناء إنشاء الفاتورة.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) closeDialog(); }}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] w-[96vw] max-w-[1040px] flex-col overflow-hidden rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
        <DialogHeader className="shrink-0 border-b border-[#E6E9EE] bg-white px-5 py-4">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]"><FilePlus2 className="h-[16px] w-[16px]" /></div>
            <div>
              <DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">إنشاء فاتورة جديدة</DialogTitle>
              <DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">أنشئ فاتورة احترافية، ثم افتحها مباشرة لإنشاء PDF وإرسالها إلى المراجعة.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-[10px]">
            <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1fr)_310px]">
              <div className="space-y-[10px]">
                <FormSection title="بيانات العميل" icon={UserRound}>
                  <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                    <Field label="اسم العميل" required>
                      <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="اسم العميل" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    </Field>

                    <Field label="رقم الهاتف" required>
                      <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="77xxxxxxx" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    </Field>
                  </div>

                  <Field label="العنوان" required>
                    <Input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="الحي، الشارع، أقرب معلم..." className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>

                  <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                    <Field label="المدينة">
                      <Input value={customerCity} onChange={(event) => setCustomerCity(event.target.value)} placeholder="عدن" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    </Field>

                    <Field label="المنطقة / المحافظة">
                      <Input value={customerRegion} onChange={(event) => setCustomerRegion(event.target.value)} placeholder="المنصورة، حضرموت..." className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    </Field>
                  </div>

                  <Field label="ملاحظات العميل">
                    <Textarea rows={3} value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} placeholder="أي ملاحظات خاصة بالفاتورة أو التوصيل..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>
                </FormSection>

                <FormSection title="إضافة المنتجات" icon={ShoppingBag}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
                    <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الماركة..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    {productSearchLoading && <Loader2 className="absolute left-[12px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 animate-spin text-[#675CBA]" />}
                  </div>

                  <div className="grid max-h-[220px] grid-cols-1 gap-[5px] overflow-y-auto rounded-[10px] border border-[#E7EAEF] bg-[#FAFBFC] p-[6px] sm:grid-cols-2">
                    {products.map((product) => (
                      <button key={product.id} type="button" onClick={() => addProduct(product)} className="flex items-center gap-[8px] rounded-[9px] border border-[#E6E9EE] bg-white p-[7px] text-right hover:border-[#CBC5E7] hover:bg-[#F9F8FF]">
                        <ProductImage product={product} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-semibold text-[#555D67]">{product.name_ar || product.name}</p>
                          <p className="mt-[2px] truncate text-[9px] text-[#9BA2AC]">{product.brand || product.name}</p>
                          <p className="mt-[3px] text-[9px] font-semibold text-[#675CBA]">{toDisplay(product.price).toLocaleString("en-US")} {currencySymbol}</p>
                        </div>
                        <span className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-[7px] bg-[#F1EFFF] text-[#675CBA]"><Plus className="h-[10px] w-[10px]" /></span>
                      </button>
                    ))}

                    {!productSearchLoading && products.length === 0 && <p className="col-span-full py-8 text-center text-[10px] text-[#9BA2AC]">لا توجد منتجات مطابقة.</p>}
                  </div>

                  <button type="button" onClick={addManualItem} className="flex h-[36px] w-full items-center justify-center gap-[6px] rounded-[9px] border border-dashed border-[#D6DBE2] bg-[#FAFBFC] text-[10px] font-semibold text-[#707883] hover:bg-white">
                    <Plus className="h-[11px] w-[11px]" />
                    إضافة بند يدوي
                  </button>
                </FormSection>

                <FormSection title={`بنود الفاتورة (${items.length})`} icon={Package}>
                  <div className="space-y-[6px]">
                    {items.map((item, index) => (
                      <div key={item.key} className="rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[8px]">
                        <div className="flex items-start gap-[8px]">
                          <div className="flex h-[44px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#E6E9EE] bg-white">
                            {item.product_image ? <img src={item.product_image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-[13px] w-[13px] text-[#A0A6AF]" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <Input value={item.product_name} onChange={(event) => updateItem(item.key, { product_name: event.target.value, product_id: item.product_id })} placeholder={`اسم البند ${index + 1}`} className="h-[36px] rounded-[8px] border-[#E2E6EB] bg-white text-[10px] shadow-none focus-visible:ring-0" />

                            <div className="mt-[6px] grid grid-cols-[90px_minmax(0,1fr)] gap-[6px]">
                              <Input type="number" min={1} value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })} className="h-[36px] rounded-[8px] border-[#E2E6EB] bg-white text-[10px] shadow-none focus-visible:ring-0" />

                              <div className="relative">
                                <Input type="number" min={0} step={currencyMode === "SAR" ? "0.01" : "1"} value={Number(toDisplay(item.price).toFixed(currencyMode === "SAR" ? 2 : 0))} onChange={(event) => updateItem(item.key, { price: Math.max(0, toBase(Number(event.target.value) || 0)) })} className="h-[36px] rounded-[8px] border-[#E2E6EB] bg-white pl-[44px] text-[10px] shadow-none focus-visible:ring-0" />
                                <span className="pointer-events-none absolute left-[9px] top-1/2 -translate-y-1/2 text-[8px] font-semibold text-[#9AA1AB]">{currencySymbol}</span>
                              </div>
                            </div>
                          </div>

                          <button type="button" onClick={() => removeItem(item.key)} className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] text-[#C15F56] hover:bg-[#FFF0ED]"><Trash2 className="h-[11px] w-[11px]" /></button>
                        </div>

                        <div className="mt-[6px] flex items-center justify-between border-t border-[#ECEFF2] pt-[6px]">
                          <span className="text-[9px] text-[#9BA2AC]">الإجمالي</span>
                          <span className="text-[10px] font-semibold text-[#59616B]">{toDisplay(item.price * item.quantity).toLocaleString("en-US")} {currencySymbol}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </FormSection>
              </div>

              <div className="space-y-[10px] xl:sticky xl:top-0 xl:self-start">
                <FormSection title="إعدادات الفاتورة" icon={ReceiptText}>
                  <Field label="العملة">
                    <Select value={currencyMode} onValueChange={setCurrencyMode}>
                      <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>{currencies.map(({ code, meta }) => <SelectItem key={code} value={code}>{meta.label} — {meta.symbol}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>

                  <Field label="طريقة الدفع">
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cod">الدفع عند الاستلام</SelectItem>
                        <SelectItem value="cash">نقدًا</SelectItem>
                        <SelectItem value="transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="card">بطاقة</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="حالة الطلب">
                    <Select value={orderStatus} onValueChange={setOrderStatus}>
                      <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="confirmed">مؤكد</SelectItem>
                        <SelectItem value="processing">قيد التجهيز</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FormSection>

                <FormSection title="التوصيل" icon={Truck}>
                  <Field label="شركة التوصيل">
                    <Select value={deliveryCompanyId} onValueChange={selectDeliveryCompany}>
                      <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون شركة محددة</SelectItem>
                        {deliveryCompanies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}{company.delivery_days ? ` — ${company.delivery_days}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label={`رسوم التوصيل (${currencySymbol})`}>
                    <Input type="number" min={0} step={currencyMode === "SAR" ? "0.01" : "1"} value={Number(toDisplay(deliveryFee).toFixed(currencyMode === "SAR" ? 2 : 0))} onChange={(event) => setDeliveryFee(Math.max(0, toBase(Number(event.target.value) || 0)))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:ring-0" />
                  </Field>
                </FormSection>

                <FormSection title="الخصم" icon={CircleDollarSign}>
                  <Field label="كود / مرجع الخصم">
                    <Input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="اختياري" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:ring-0" />
                  </Field>

                  <Field label={`قيمة الخصم (${currencySymbol})`}>
                    <Input type="number" min={0} step={currencyMode === "SAR" ? "0.01" : "1"} value={Number(toDisplay(discountAmount).toFixed(currencyMode === "SAR" ? 2 : 0))} onChange={(event) => setDiscountAmount(Math.max(0, toBase(Number(event.target.value) || 0)))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:ring-0" />
                  </Field>
                </FormSection>

                <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                  <div className="border-b border-[#EDF0F3] px-[12px] py-[10px]">
                    <h3 className="text-[11px] font-semibold text-[#4A525C]">ملخص الفاتورة</h3>
                    <p className="mt-[3px] text-[9px] text-[#9BA2AC]">القيم المعروضة بعملة الفاتورة، والحفظ يتم بالقيمة الأساسية.</p>
                  </div>

                  <div className="space-y-[8px] p-[12px]">
                    <SummaryRow label="المجموع" value={`${toDisplay(subtotal).toLocaleString("en-US")} ${currencySymbol}`} />
                    <SummaryRow label="التوصيل" value={`${toDisplay(deliveryFee).toLocaleString("en-US")} ${currencySymbol}`} />
                    <SummaryRow label="الخصم" value={`- ${toDisplay(discountAmount).toLocaleString("en-US")} ${currencySymbol}`} negative={discountAmount > 0} />

                    <div className="border-t border-[#E8EBEF] pt-[9px]">
                      <div className="flex items-end justify-between gap-[10px]">
                        <div>
                          <p className="text-[9px] text-[#9299A3]">الإجمالي النهائي</p>
                          <p className="mt-[4px] text-[20px] font-semibold leading-none text-[#303741]">{toDisplay(total).toLocaleString("en-US")} <span className="text-[11px] text-[#675CBA]">{currencySymbol}</span></p>
                        </div>
                        <span className="rounded-[7px] bg-[#EFF8F2] px-[8px] py-[5px] text-[9px] font-semibold text-[#568468]">{items.reduce((sum, item) => sum + item.quantity, 0)} قطعة</span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="rounded-[11px] border border-[#DCE7F4] bg-[#F5F8FC] p-[10px]">
                  <div className="flex items-start gap-[7px]">
                    <Check className="mt-[1px] h-[12px] w-[12px] shrink-0 text-[#5680CF]" />
                    <p className="text-[9px] leading-5 text-[#6E8197]">بعد الإنشاء ستفتح الفاتورة تلقائيًا. احفظ PDF من المحرر، وبعدها ستنتقل إلى <strong>بانتظار المراجعة</strong> ويمكن قبولها من صفحة الفواتير.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-[#E5E9EF] bg-white px-5 py-3">
            <div className="flex flex-col-reverse gap-[7px] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-[6px] text-[9px] text-[#9AA2AC]">
                <WalletCards className="h-[11px] w-[11px]" />
                سعر الصرف المستخدم: 1 ر.س = {currencyRate.toLocaleString("en-US")} {currencySymbol}
              </div>

              <div className="flex gap-[7px]">
                <Button type="button" variant="outline" disabled={isSaving} onClick={closeDialog} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
                <Button type="submit" disabled={isSaving} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{isSaving ? <Loader2 className="ml-[6px] h-[12px] w-[12px] animate-spin" /> : <FilePlus2 className="ml-[6px] h-[12px] w-[12px]" />}إنشاء وفتح الفاتورة</Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[10.5px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[10px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const ProductImage = ({ product }: { product: Product }) => {
  const image = product.images?.find(Boolean) || "";
  return <div className="flex h-[46px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#E7EAEF] bg-[#F5F6F8]">{image ? <img src={image} alt={product.name_ar || product.name} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-[13px] w-[13px] text-[#A0A6AF]" />}</div>;
};

const SummaryRow = ({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) => {
  return <div className="flex items-center justify-between gap-[10px]"><span className="text-[10px] text-[#858D97]">{label}</span><span className={cn("text-[10px] font-semibold", negative ? "text-[#C15F56]" : "text-[#59616B]")}>{value}</span></div>;
};

export default NewInvoiceCreator;