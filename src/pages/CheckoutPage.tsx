import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertCircle, Banknote, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, CreditCard, Loader2, MapPin, ShoppingBag, Ticket, Truck, User, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SavedAddress, migrateLegacyCheckoutInfo, upsertSavedAddress } from "@/lib/savedAddresses";
import { optimizeImage, handleImageError } from "@/lib/imageUrl";
import { useCurrency } from "@/lib/currency";

const orderAccessorySchema = z.object({
  name: z.string().max(200).optional(),
  name_ar: z.string().max(200).optional(),
  price: z.number().nonnegative().max(1000000),
  quantity: z.number().int().min(1).max(100),
  image_url: z.string().max(2000).optional(),
});

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1).max(500),
  product_image: z.string().max(2000).optional(),
  quantity: z.number().int().min(1).max(100),
  price: z.number().nonnegative().max(10000000),
  selected_size: z.string().max(100).nullable(),
  selected_color: z.string().max(100).nullable().optional(),
  selected_accessories: z.array(orderAccessorySchema).max(50),
});

const orderItemsSchema = z.array(orderItemSchema).min(1).max(100);

const arabicDigitsToLatin = (value: string) => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizeCheckoutPhone = (value: string) => {
  const latin = arabicDigitsToLatin(value).trim();
  let compact = latin.replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;

  if (!compact.startsWith("+")) {
    let digits = compact.replace(/\D/g, "");
    if (/^0?7\d{8}$/.test(digits)) {
      if (digits.startsWith("0")) digits = digits.slice(1);
      return `+967${digits}`;
    }
    if (/^9677\d{8}$/.test(digits)) return `+${digits}`;
    throw new Error("invalid_checkout_phone");
  }

  if (!/^\+[1-9]\d{7,14}$/.test(compact)) throw new Error("invalid_checkout_phone");
  return compact;
};

const orderCountryFromPhone = (phone: string) => phone.startsWith("+967") ? "YE" : "GLOBAL";

interface DeliveryCompany {
  id: string;
  name: string;
  base_fee: number;
  delivery_days: string | null;
  service_scope?: "aden" | "outside" | "all";
}

interface BankAccount {
  bank: string;
  account: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
}

interface CODRegion {
  id: string;
  region_name: string;
  region_name_ar: string;
}

const YEMEN_GOVERNORATES = [
  "عدن",
  "أمانة العاصمة",
  "صنعاء",
  "تعز",
  "حضرموت",
  "إب",
  "الحديدة",
  "ذمار",
  "لحج",
  "أبين",
  "شبوة",
  "مأرب",
  "الجوف",
  "صعدة",
  "عمران",
  "حجة",
  "المحويت",
  "ريمة",
  "الضالع",
  "البيضاء",
  "المهرة",
  "أرخبيل سقطرى",
] as const;

const normalizeGovernorate = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("عدن") || normalized.includes("aden")) return "عدن";
  return YEMEN_GOVERNORATES.find((governorate) => normalized.includes(governorate.toLowerCase())) || "";
};

const cityWithoutGovernorate = (value: string, governorate: string) => {
  const city = value.trim();
  if (!governorate || !city.startsWith(governorate)) return city;
  return city.slice(governorate.length).replace(/^[\s\-–—،,]+/, "").trim();
};

const composeOrderCity = (governorate: string, city: string) => [governorate.trim(), city.trim()].filter(Boolean).join(" - ");

const deliveryCompanyScope = (company: DeliveryCompany) => company.service_scope || (company.name.includes("فلامنجو") || String(company.delivery_days || "").includes("داخل عدن") ? "aden" : "outside");

const STEPS = [
  { key: "info", label: "المعلومات", icon: User },
  { key: "address", label: "العنوان", icon: MapPin },
  { key: "payment", label: "الدفع", icon: CreditCard },
  { key: "review", label: "المراجعة", icon: Check },
] as const;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { customer, cart, getCartTotal, clearCart, currencyMode } = useStore();

  const isGuestLike = !customer || customer.id === "guest";
  const subtotal = getCartTotal();
  const { format: formatCurrency } = useCurrency();

  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const initialGovernorate = normalizeGovernorate(customer?.region);
  const [deliveryScope, setDeliveryScope] = useState<"aden" | "outside">(initialGovernorate === "عدن" ? "aden" : "outside");
  const [selectedRegion, setSelectedRegion] = useState(initialGovernorate);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [formData, setFormData] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: "",
    address: "",
    city: "",
    notes: "",
  });

  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addressOwnerKey, setAddressOwnerKey] = useState("guest");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);

  useEffect(() => {
    const governorate = normalizeGovernorate(customer?.region);
    if (governorate) {
      setSelectedRegion(governorate);
      setDeliveryScope(governorate === "عدن" ? "aden" : "outside");
    }
  }, [customer?.region]);

  useEffect(() => {
    if (deliveryScope === "aden" && selectedRegion !== "عدن") {
      setSelectedRegion("عدن");
    } else if (deliveryScope === "outside" && selectedRegion === "عدن") {
      setSelectedRegion("");
    }
  }, [deliveryScope, selectedRegion]);

  const selectGovernorate = (governorate: string) => {
    setSelectedAddressId("");
    setSelectedRegion(governorate);
    setDeliveryScope(governorate === "عدن" ? "aden" : "outside");
  };

  useEffect(() => {
    setAddressOwnerKey(customer?.id && customer.id !== "guest" ? customer.id : "guest");
  }, [customer?.id]);

  useEffect(() => {
    let active = true;

    const loadAddresses = async () => {
      let list: SavedAddress[] = [];

      if (!isGuestLike && customer?.id) {
        const { data, error } = await (supabase as any).from("customer_addresses").select("*").order("is_default", { ascending: false }).order("updated_at", { ascending: false });
        if (!error) {
          list = (data || []).map((address: any) => ({ id: address.id, label: address.label, name: address.recipient_name, phone: address.phone, city: address.city, address: address.address_line1, notes: address.notes || "", isDefault: Boolean(address.is_default), updatedAt: address.updated_at }));
        }
      } else {
        list = migrateLegacyCheckoutInfo(addressOwnerKey);
      }

      if (!active) return;
      setSavedAddresses(list);
      const defaultAddress = list.find((address) => address.isDefault) || list[0];
      if (!defaultAddress) return;
      const savedGovernorate = normalizeGovernorate(defaultAddress.city);
      if (savedGovernorate) {
        setSelectedRegion(savedGovernorate);
        setDeliveryScope(savedGovernorate === "عدن" ? "aden" : "outside");
      }
      setSelectedAddressId(defaultAddress.id);
      setFormData((current) => ({ ...current, name: isGuestLike ? String(defaultAddress.name || current.name || "") : current.name, phone: isGuestLike ? String(defaultAddress.phone || current.phone || "") : current.phone, city: cityWithoutGovernorate(defaultAddress.city, savedGovernorate), address: defaultAddress.address, notes: defaultAddress.notes || "" }));
    };

    void loadAddresses();
    return () => { active = false; };
  }, [addressOwnerKey, isGuestLike, customer?.id]);

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["delivery-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_companies").select("id,name,base_fee,delivery_days,service_scope,is_active").eq("is_active", true).order("name");
      if (error) throw error;
      return (data || []) as DeliveryCompany[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const flamingoDeliveryCompany = useMemo(() => deliveryCompanies.find((company) => deliveryCompanyScope(company) === "aden") || null, [deliveryCompanies]);
  const visibleDeliveryCompanies = useMemo(() => deliveryCompanies.filter((company) => {
    const scope = deliveryCompanyScope(company);
    return scope === deliveryScope || scope === "all";
  }), [deliveryCompanies, deliveryScope]);

  useEffect(() => {
    if (!visibleDeliveryCompanies.some((company) => company.id === selectedDelivery)) {
      setSelectedDelivery(visibleDeliveryCompanies[0]?.id || "");
    }
  }, [selectedDelivery, visibleDeliveryCompanies]);

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["checkout-payment-methods"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("payment_methods").select("id,code,name,name_ar,type").eq("is_active", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const visiblePaymentMethods = useMemo(() => {
    const nonCashMethods = paymentMethods.filter((method) => method.type !== "cash" && method.code !== "cod" && method.code !== "cash");
    if (deliveryScope === "outside") return nonCashMethods;

    const codMethod = paymentMethods.find((method) => method.type === "cash" || method.code === "cod" || method.code === "cash") || {
      id: "aden-cod",
      code: "cod",
      name: "Cash on delivery",
      name_ar: "الدفع عند الاستلام",
      type: "cash",
    };

    return [codMethod, ...nonCashMethods];
  }, [paymentMethods, deliveryScope]);

  useEffect(() => {
    if (paymentMethod && !visiblePaymentMethods.some((method) => method.code === paymentMethod)) {
      setPaymentMethod("");
    }
  }, [paymentMethod, visiblePaymentMethods]);

  const { data: checkoutSettings = {} } = useQuery<Record<string, unknown>>({
    queryKey: ["checkout-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value").in("key", ["bank_accounts", "bank_accounts_ye", "bank_accounts_sa"]);
      return Object.fromEntries((data || []).map((setting) => [setting.key, setting.value]));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const bankAccounts = useMemo(() => {
    let value: any = checkoutSettings.bank_accounts ?? checkoutSettings.bank_accounts_ye ?? checkoutSettings.bank_accounts_sa;
    if (typeof value === "string") {
      try { value = JSON.parse(value); } catch { return [] as BankAccount[]; }
    }
    if (!Array.isArray(value)) return [] as BankAccount[];
    return value.map((item: any) => ({ bank: String(item?.bank || ""), account: String(item?.account || ""), name: String(item?.name || "") })) as BankAccount[];
  }, [checkoutSettings]);

  const { data: codRegions = [] } = useQuery({
    queryKey: ["cod-regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cod_regions").select("id,region_name,region_name_ar").eq("is_active", true).order("region_name_ar");
      if (error) throw error;
      return (data || []) as CODRegion[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const selectedCompany = deliveryCompanies.find((company) => company.id === selectedDelivery);
  const deliveryFee = selectedCompany?.base_fee || 0;
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);
  const selectedPaymentMethod = visiblePaymentMethods.find((method) => method.code === paymentMethod) || null;
  const isCashPayment = selectedPaymentMethod?.type === "cash" || selectedPaymentMethod?.code === "cod" || selectedPaymentMethod?.code === "cash";
  const isBankPayment = selectedPaymentMethod?.type === "bank" || selectedPaymentMethod?.code === "bank";

  const applyCoupon = async () => {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) { toast({ title: "أدخل كود الخصم", variant: "destructive" }); return; }
    try {
      const { data, error } = await (supabase as any).rpc("validate_customer_coupon", { p_code: normalized });
      if (error) throw error;
      if (!data?.valid) { setDiscountAmount(0); setAppliedCoupon(null); toast({ title: "الكود غير صالح", description: "كود الخصم غير موجود أو غير فعال.", variant: "destructive" }); return; }
      const value = Number(data.value) || 0;
      let discount = data.type === "percentage" ? (subtotal * value) / 100 : value;
      discount = Math.min(discount, subtotal);
      setDiscountAmount(discount); setAppliedCoupon(normalized);
      toast({ title: "تم تطبيق الكوبون", description: `خصم ${formatCurrency(discount)}` });
    } catch {
      setDiscountAmount(0); setAppliedCoupon(null);
      toast({ title: "تعذر التحقق من الكوبون", description: "حاول مرة أخرى.", variant: "destructive" });
    }
  };

  const removeCoupon = () => { setCouponCode(""); setDiscountAmount(0); setAppliedCoupon(null); toast({ title: "تمت إزالة الكوبون" }); };

  const selectedSavedAddress = savedAddresses.find((address) => address.id === selectedAddressId);

  const selectSavedAddress = (id: string) => {
    setSelectedAddressId(id); setAddressPickerOpen(false);
    if (!id) { setFormData((current) => ({ ...current, city: "", address: "", notes: "" })); return; }
    const address = savedAddresses.find((item) => item.id === id);
    if (!address) return;
    const savedGovernorate = normalizeGovernorate(address.city);
    if (savedGovernorate) {
      setSelectedRegion(savedGovernorate);
      setDeliveryScope(savedGovernorate === "عدن" ? "aden" : "outside");
    }
    setFormData((current) => ({ ...current, name: isGuestLike ? String(address.name || current.name || "") : current.name, phone: isGuestLike ? String(address.phone || current.phone || "") : current.phone, city: cityWithoutGovernorate(address.city, savedGovernorate), address: address.address, notes: address.notes || "" }));
  };

  const createSecureOrder = async (items: unknown[]) => {
    const normalizedCustomerPhone = normalizeCheckoutPhone(String(customer?.phone || formData.phone || "").trim());
    const orderCountry = orderCountryFromPhone(normalizedCustomerPhone);
    const { data, error } = await (supabase as any).rpc("create_secure_order_v2", {
      p_customer_name: String(customer?.name || formData.name || "").trim(),
      p_customer_phone: normalizedCustomerPhone,
      p_customer_address: formData.address.trim(),
      p_customer_notes: formData.notes.trim() || null,
      p_country: orderCountry,
      p_customer_city: composeOrderCity(selectedRegion, formData.city),
      p_customer_region: selectedRegion || null,
      p_items: items,
      p_payment_method: isCashPayment ? "cod" : paymentMethod,
      p_currency_mode: currencyMode,
      p_currency_code: currencyMode,
      p_coupon_code: appliedCoupon || null,
      p_delivery_company_id: selectedDelivery || null,
    });
    if (error) { console.error("RPC ERROR FULL:", error); throw error; }
    return data;
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      const name = String(customer?.name || formData.name || "").trim();
      const phone = String(customer?.phone || formData.phone || "").trim();
      if (isGuestLike && (!name || !phone)) { toast({ title: "الاسم ورقم الهاتف مطلوبان", variant: "destructive" }); return false; }
      try { normalizeCheckoutPhone(phone); } catch { toast({ title: "رقم الهاتف غير صحيح", description: "لرقم يمني أدخل 9 أرقام تبدأ بـ7، وللأرقام الدولية استخدم رمز الدولة مثل +966.", variant: "destructive" }); return false; }
    }
    if (step === 1 && (!selectedRegion || !formData.city.trim() || !formData.address.trim())) { toast({ title: "المحافظة والمدينة والعنوان مطلوبة", variant: "destructive" }); return false; }
    if (step === 2) {
      if (!selectedRegion) { toast({ title: "اختر محافظة التوصيل", variant: "destructive" }); return false; }
      if (!selectedDelivery || !selectedCompany || !visibleDeliveryCompanies.some((company) => company.id === selectedDelivery)) { toast({ title: "اختر شركة التوصيل", description: "يجب تحديد شركة التوصيل المناسبة لنطاق التوصيل قبل المتابعة.", variant: "destructive" }); return false; }
      if (!paymentMethod || !selectedPaymentMethod) { toast({ title: "اختر طريقة الدفع", description: "يجب تحديد طريقة الدفع قبل المتابعة.", variant: "destructive" }); return false; }
      if (isCashPayment && deliveryScope !== "aden") { toast({ title: "الدفع عند الاستلام متاح داخل عدن فقط", variant: "destructive" }); return false; }
    }
    return true;
  };

  const nextStep = () => { if (!validateStep(currentStep)) return; setCurrentStep((current) => Math.min(current + 1, STEPS.length - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const prevStep = () => { setCurrentStep((current) => Math.max(current - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const saveAddressForCheckout = async () => {
    const draft = { id: selectedAddressId || crypto.randomUUID(), label: selectedSavedAddress?.label || `عنوان ${savedAddresses.length + 1}`, name: String(customer?.name || formData.name || "").trim(), phone: String(customer?.phone || formData.phone || "").trim(), city: composeOrderCity(selectedRegion, formData.city), address: formData.address.trim(), notes: formData.notes.trim(), isDefault: selectedSavedAddress?.isDefault ?? savedAddresses.length === 0 };
    if (isGuestLike || !customer?.id) { upsertSavedAddress(addressOwnerKey, draft); return; }
    const { error } = await (supabase as any).from("customer_addresses").upsert({ id: draft.id, user_id: customer.id, label: draft.label, recipient_name: draft.name, phone: draft.phone, city: draft.city, address_line1: draft.address, notes: draft.notes || null, is_default: draft.isDefault }).select("id").single();
    if (error) console.warn("ADDRESS SAVE ERROR:", error);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;
    if (!termsAccepted) { toast({ title: "وافق على السياسات لإتمام الطلب", description: "راجع الشروط وسياسة الخصوصية والإرجاع ثم فعّل مربع الموافقة.", variant: "destructive" }); return; }
    setIsSubmitting(true);
    const rawOrderItems = cart.map((item) => {
      const basePrice = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price;
      const accessoriesTotal = item.selectedAccessories?.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) || 0;
      return { product_id: item.product.id, product_name: item.product.nameAr, product_image: item.product.images?.[0] || "", quantity: item.quantity, price: basePrice + accessoriesTotal, selected_size: item.selectedSize || null, selected_color: item.selectedColor || item.variantColor || null, selected_accessories: (item.selectedAccessories || []).map((accessory) => ({ name: String((accessory as any).name || ""), name_ar: String((accessory as any).name_ar || (accessory as any).name || ""), price: Number((accessory as any).price) || 0, quantity: Number((accessory as any).quantity) || 1, image_url: String((accessory as any).image_url || "") })) };
    });
    const validation = orderItemsSchema.safeParse(rawOrderItems);
    if (!validation.success) { console.error("ORDER VALIDATION:", validation.error); toast({ title: "بيانات الطلب غير صحيحة", description: "تحقق من المنتجات وحاول مرة أخرى.", variant: "destructive" }); setIsSubmitting(false); return; }
    try {
      const customerName = String(customer?.name || formData.name || "").trim();
      const customerPhone = normalizeCheckoutPhone(String(customer?.phone || formData.phone || "").trim());
      await saveAddressForCheckout();
      const createdOrder = await createSecureOrder(validation.data);
      const regionData = codRegions.find((region) => region.id === selectedRegion || region.region_name === selectedRegion || region.region_name_ar === selectedRegion);
      const amountsAreNative = createdOrder.total_base !== null && createdOrder.total_base !== undefined && Number(createdOrder.exchange_rate_snapshot) > 0;
      const orderData = { orderId: createdOrder.order_id, orderNumber: createdOrder.order_number, trackingToken: createdOrder.tracking_token, customerName: customerName || "عميل", customerPhone, customerAddress: formData.address || "-", customerCity: composeOrderCity(selectedRegion, formData.city), customerNotes: formData.notes || "", items: Array.isArray(createdOrder.items) ? createdOrder.items : validation.data, subtotal: Number(createdOrder.subtotal), deliveryFee: Number(createdOrder.delivery_fee), discountAmount: Number(createdOrder.discount_amount), couponCode: Number(createdOrder.discount_amount) > 0 ? appliedCoupon : null, total: Number(createdOrder.total), totalBase: Number(createdOrder.total_base ?? createdOrder.total), amountsAreNative, paymentMethod, paymentMethodName: selectedPaymentMethod?.name_ar || selectedPaymentMethod?.name || paymentMethod, deliveryCompany: createdOrder.delivery_company || selectedCompany?.name || "", selectedRegion: regionData?.region_name_ar || selectedRegion || null, country: orderCountryFromPhone(customerPhone), currencyMode: createdOrder.currency_mode || currencyMode, createdAt: createdOrder.created_at || new Date().toISOString() };
      clearCart();
      navigate("/order-confirmation", { state: { orderData } });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "فشل إرسال الطلب";
      const message = rawMessage.includes("invalid_checkout_phone") || rawMessage.includes("invalid_yemen_phone") ? "أدخل رقم هاتف صحيح. لليمن استخدم 9 أرقام تبدأ بـ7، وللدول الأخرى استخدم رمز الدولة." : rawMessage.includes("order_rate_limit") ? "تم إرسال عدة طلبات خلال فترة قصيرة. حاول مرة أخرى بعد قليل." : rawMessage.includes("guest_order_capacity_limit") ? "إنشاء الطلبات غير متاح مؤقتاً بسبب عدد كبير من المحاولات. حاول بعد قليل." : rawMessage.includes("insufficient_stock") ? "تغير مخزون أحد المنتجات في السلة. راجع الكمية وحاول مرة أخرى." : rawMessage.includes("variant_selection_required") ? "تحقق من اختيار المقاس أو اللون لجميع المنتجات." : rawMessage.includes("invalid_coupon") ? "كود الخصم لم يعد صالحاً. أزله أو جرّب كوداً آخر." : rawMessage.includes("invalid_payment_method") ? "طريقة الدفع المختارة غير متاحة حالياً. اختر طريقة دفع أخرى." : rawMessage.includes("invalid_cod_region") ? "الدفع عند الاستلام متاح حاليًا داخل عدن فقط. اختر التحويل البنكي لهذه المحافظة." : rawMessage.includes("invalid_delivery_scope") ? "شركة التوصيل لا تغطي المحافظة المختارة. اختر شركة أخرى." : rawMessage.includes("invalid_delivery_company") || rawMessage.includes("delivery_company_required") ? "شركة التوصيل المختارة غير متاحة حالياً. اختر شركة توصيل أخرى." : rawMessage;
      toast({ title: "تعذر إنشاء الطلب", description: message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return <div className="min-h-screen bg-[#FFFDFC]" dir="rtl"><Navbar /><CartDrawer /><main className="flex min-h-[65vh] items-center justify-center px-4 py-16"><div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAECE9]"><ShoppingBag className="h-5 w-5 text-[#C66C72]" strokeWidth={1.4} /></span><h1 className="mt-4 text-[18px] font-semibold text-[#403633]">السلة فارغة</h1><p className="mt-1.5 text-[8px] text-[#9B8D88]">أضف بعض المنتجات قبل إتمام الطلب.</p><button type="button" onClick={() => navigate("/products")} className="mt-5 h-10 rounded-[10px] bg-[#D4777D] px-6 text-[9px] font-semibold text-white">تصفح المنتجات</button></div></main><Footer /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
      <Navbar /><CartDrawer />
      <main className="pb-12 pt-5 md:pb-16 md:pt-7">
        <div className="mx-auto w-full max-w-[1120px] px-3 md:px-6">
          <div className="mb-5 md:mb-7"><div className="flex items-center gap-2"><span className="h-[2px] w-4 rounded-full bg-[#D4777D]" /><span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">CHECKOUT</span></div><h1 className="mt-1.5 text-[19px] font-semibold tracking-[-0.025em] text-[#3E3431] md:text-[26px]">إتمام الطلب</h1><p className="mt-1 text-[8px] text-[#9D8F8A]">بقيت خطوات بسيطة لإتمام طلبك.</p></div>
          <div className="mb-6 overflow-hidden rounded-[14px] border border-[#EAE0DC] bg-white px-2 py-4 md:px-5"><div className="relative mx-auto w-full max-w-[580px]"><div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[16px] h-px bg-[#EAE2DF]" /><div className="pointer-events-none absolute right-[12.5%] top-[16px] h-px bg-[#D9AAA7] transition-[width] duration-300" style={{ width: `${(currentStep / (STEPS.length - 1)) * 75}%` }} /><div className="relative grid grid-cols-4">{STEPS.map((step, index) => { const Icon = step.icon; const done = index < currentStep; const active = index === currentStep; return <div key={step.key} className="flex min-w-0 flex-col items-center justify-start text-center"><button type="button" onClick={() => { if (index < currentStep) setCurrentStep(index); }} disabled={index > currentStep} className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${done ? "border-[#D4777D] bg-[#D4777D] text-white" : active ? "border-[#D4777D] bg-[#FFF5F3] text-[#B86168]" : "border-[#E8DEDA] bg-[#FAF8F7] text-[#B0A49F]"}`}>{done ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}</button><span className={`mt-2 block w-full text-center text-[6px] font-medium leading-none md:text-[7px] ${active || done ? "text-[#685853]" : "text-[#A99B96]"}`}>{step.label}</span></div>; })}</div></div></div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5"><div className="min-w-0"><section className="overflow-hidden rounded-[16px] border border-[#EAE0DC] bg-white">
            {currentStep === 1 && (
              <div className="px-4 pt-4 md:px-5 md:pt-5">
                <label htmlFor="checkout-governorate" className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">المحافظة *</label>
                <select id="checkout-governorate" name="governorate" value={selectedRegion} onChange={(event) => selectGovernorate(event.target.value)} className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none focus:border-[#D9AEAA]">
                  <option value="">اختر المحافظة</option>
                  {YEMEN_GOVERNORATES.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
                </select>
                <p className="mt-1.5 text-[6px] leading-5 text-[#A0938E]">تتحدد شركات التوصيل وطرق الدفع المتاحة حسب المحافظة.</p>
              </div>
            )}
            {currentStep === 2 && (
              <div className="px-4 pt-4 md:px-5 md:pt-5">
                <label htmlFor="checkout-payment-governorate" className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">محافظة التوصيل *</label>
                <select id="checkout-payment-governorate" name="payment_governorate" value={selectedRegion} onChange={(event) => selectGovernorate(event.target.value)} className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none focus:border-[#D9AEAA]">
                  <option value="">اختر المحافظة</option>
                  {YEMEN_GOVERNORATES.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
                </select>
                {deliveryScope === "outside" && (
                  <div className="mt-3 flex items-start gap-2 rounded-[11px] border border-[#EEDFC4] bg-[#FFF9EF] px-3 py-3">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B17C37]" strokeWidth={1.5} />
                    <div>
                      <p className="text-[8px] font-semibold text-[#8E6937]">التوصيل إلى {selectedRegion || "المحافظات الأخرى"}</p>
                      <p className="mt-1 text-[7px] leading-5 text-[#8A7659]">الدفع عند الاستلام مفعّل داخل عدن فقط حاليًا؛ للمحافظات الأخرى اختر التحويل البنكي، وستظهر الرسوم والمدة قبل التأكيد.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentStep === 3 && (
              <div className="px-4 pt-4 md:px-5 md:pt-5">
                <div className="rounded-[11px] border border-[#EAE0DC] bg-[#FFFCFB] p-3">
                  <p className="text-[7px] text-[#8C7E79]">المحافظة: <span className="font-semibold text-[#514540]">{selectedRegion}</span></p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                    <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4777D]" />
                    <span className="text-[7px] leading-5 text-[#746661]">قرأت وأوافق على <Link to="/terms" target="_blank" className="font-semibold text-[#B86168] underline underline-offset-2">الشروط والأحكام</Link> و<Link to="/privacy-policy" target="_blank" className="font-semibold text-[#B86168] underline underline-offset-2">سياسة الخصوصية</Link> و<Link to="/returns-policy" target="_blank" className="font-semibold text-[#B86168] underline underline-offset-2">سياسة الإرجاع</Link>.</span>
                  </label>
                </div>
              </div>
            )}
            {currentStep === 0 && <div className="p-4 md:p-5"><div className="mb-5 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]"><User className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} /></span><div><h2 className="text-[11px] font-semibold text-[#483C38]">معلوماتك الشخصية</h2><p className="mt-0.5 text-[7px] text-[#A0938E]">بيانات التواصل الخاصة بالطلب.</p></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">الاسم الكامل *</label><input value={isGuestLike ? formData.name : customer?.name || ""} onChange={(event) => { if (isGuestLike) setFormData((current) => ({ ...current, name: event.target.value })); }} disabled={!isGuestLike} placeholder="أدخل اسمك" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA] disabled:bg-[#F7F4F2] disabled:text-[#8E817C]" /></div><div><label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">رقم الهاتف *</label><input value={isGuestLike ? formData.phone : customer?.phone || ""} onChange={(event) => { if (isGuestLike) setFormData((current) => ({ ...current, phone: event.target.value })); }} disabled={!isGuestLike} placeholder="رقم الهاتف" dir="ltr" inputMode="tel" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-left text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA] disabled:bg-[#F7F4F2] disabled:text-[#8E817C]" /></div></div><div className="mt-4"><label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">البريد الإلكتروني <span className="font-normal text-[#AA9D98]">اختياري</span></label><input value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" dir="ltr" inputMode="email" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-left text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" /></div></div>}
            {currentStep === 1 && <div className="p-4 md:p-5"><div className="mb-5 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]"><MapPin className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} /></span><div><h2 className="text-[11px] font-semibold text-[#483C38]">عنوان التوصيل</h2><p className="mt-0.5 text-[7px] text-[#A0938E]">أدخل المكان الذي تريد استلام الطلب فيه.</p></div></div>{savedAddresses.length > 0 && <div className="relative mb-4"><label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">عنوان محفوظ</label><button type="button" onClick={() => setAddressPickerOpen((current) => !current)} className={`flex h-11 w-full items-center justify-between rounded-[10px] border bg-white px-3 text-right text-[9px] ${addressPickerOpen ? "border-[#D9AEAA]" : "border-[#E6DCD8]"}`}><div className="min-w-0">{selectedSavedAddress ? <><p className="truncate font-medium text-[#50433F]">{selectedSavedAddress.label}</p><p className="mt-0.5 truncate text-[7px] text-[#A0938E]">{selectedSavedAddress.city} — {selectedSavedAddress.address}</p></> : <span className="text-[#A0938E]">إضافة عنوان جديد</span>}</div><ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#9B8E89] transition-transform ${addressPickerOpen ? "rotate-180" : ""}`} strokeWidth={1.5} /></button>{addressPickerOpen && <><button type="button" onClick={() => setAddressPickerOpen(false)} aria-label="إغلاق قائمة العناوين" className="fixed inset-0 z-[60] cursor-default" /><div className="absolute inset-x-0 top-[68px] z-[70] overflow-hidden rounded-[12px] border border-[#E5DAD6] bg-white p-1.5 shadow-[0_12px_32px_rgba(50,35,30,0.10)]"><button type="button" onClick={() => selectSavedAddress("")} className={`flex min-h-[42px] w-full items-center justify-between rounded-[8px] px-3 text-right text-[8px] ${!selectedAddressId ? "bg-[#FFF5F3] text-[#A95B61]" : "text-[#625550]"}`}><span>عنوان جديد</span>{!selectedAddressId && <Check className="h-3.5 w-3.5" />}</button>{savedAddresses.map((address) => { const active = selectedAddressId === address.id; return <button key={address.id} type="button" onClick={() => selectSavedAddress(address.id)} className={`flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[8px] px-3 text-right ${active ? "bg-[#FFF5F3]" : "active:bg-[#FAF7F5]"}`}><div className="min-w-0"><p className={`truncate text-[8px] font-medium ${active ? "text-[#A95B61]" : "text-[#514540]"}`}>{address.label}</p><p className="mt-1 truncate text-[6px] text-[#A0938E]">{address.city} — {address.address}</p></div>{active && <Check className="h-3.5 w-3.5 shrink-0 text-[#C96F79]" />}</button>; })}</div></>}</div>}<div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">المدينة *</label><input value={formData.city} onChange={(event) => { setSelectedAddressId(""); setFormData((current) => ({ ...current, city: event.target.value })); }} placeholder="مثال: المنصورة أو المعلا" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" /></div><div><label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">العنوان بالتفصيل *</label><input value={formData.address} onChange={(event) => { setSelectedAddressId(""); setFormData((current) => ({ ...current, address: event.target.value })); }} placeholder="الحي، الشارع، رقم المبنى" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" /></div></div><div className="mt-4"><label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">ملاحظات إضافية <span className="font-normal text-[#AA9D98]">اختياري</span></label><textarea value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="وقت التسليم المفضل، معلم قريب..." className="w-full resize-none rounded-[10px] border border-[#E6DCD8] bg-white px-3 py-3 text-[9px] leading-6 text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" /></div></div>}
            {currentStep === 2 && <div className="p-4 md:p-5"><div className="mb-5 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]"><CreditCard className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} /></span><div><h2 className="text-[11px] font-semibold text-[#483C38]">الشحن والدفع</h2><p className="mt-0.5 text-[7px] text-[#A0938E]">اختر نطاق التوصيل ثم شركة التوصيل وطريقة الدفع.</p></div></div><div><div className="mb-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setDeliveryScope("aden"); setSelectedDelivery(flamingoDeliveryCompany?.id || ""); }} className={`min-h-[42px] rounded-[10px] border px-3 text-[8px] font-semibold transition-colors ${deliveryScope === "aden" ? "border-[#D4777D] bg-[#FFF4F2] text-[#A95B61]" : "border-[#E7DDD9] bg-white text-[#625550]"}`}>توصيل في عدن</button><button type="button" onClick={() => { setDeliveryScope("outside"); setSelectedDelivery(""); setPaymentMethod((current) => current === "cod" || current === "cash" ? "" : current); }} className={`min-h-[42px] rounded-[10px] border px-3 text-[8px] font-semibold transition-colors ${deliveryScope === "outside" ? "border-[#D4777D] bg-[#FFF4F2] text-[#A95B61]" : "border-[#E7DDD9] bg-white text-[#625550]"}`}>توصيل خارج عدن</button></div><div className="mb-2.5 flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[#A76A6D]" strokeWidth={1.5} /><span className="text-[8px] font-semibold text-[#574A45]">شركة التوصيل *</span></div>{visibleDeliveryCompanies.length > 0 ? <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{visibleDeliveryCompanies.map((company) => { const active = selectedDelivery === company.id; return <button key={company.id} type="button" onClick={() => setSelectedDelivery(company.id)} className={`relative flex min-h-[68px] items-center justify-between rounded-[11px] border p-3 text-right ${active ? "border-[#D9A7A4] bg-[#FFF7F5]" : "border-[#E7DDD9] bg-white active:bg-[#FAF8F7]"}`}><div><p className={`text-[9px] font-semibold ${active ? "text-[#A95B61]" : "text-[#514540]"}`}>{company.name}</p><p className="mt-1 text-[7px] text-[#9E918C]">{formatCurrency(company.base_fee)}{company.delivery_days ? ` • ${company.delivery_days}` : ""}</p></div><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-[#D4777D] bg-[#D4777D]" : "border-[#D8CECA]"}`}>{active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.2} />}</span></button>; })}</div> : <div className="flex items-center gap-2 rounded-[10px] bg-[#F8F5F3] px-3 py-3"><AlertCircle className="h-3.5 w-3.5 text-[#9B8982]" /><span className="text-[7px] text-[#887A75]">لا توجد شركات توصيل متاحة لهذا الخيار حالياً.</span></div>}</div><div className="mt-5"><p className="mb-2.5 text-[8px] font-semibold text-[#574A45]">طريقة الدفع *</p>{visiblePaymentMethods.length > 0 ? <div className="grid grid-cols-2 gap-2">{visiblePaymentMethods.map((method) => { const active = paymentMethod === method.code; const Icon = method.type === "cash" ? Banknote : CreditCard; return <button key={method.id} type="button" onClick={() => setPaymentMethod(method.code)} className={`relative flex min-h-[72px] flex-col items-start justify-center rounded-[11px] border p-3 text-right ${active ? "border-[#D9A7A4] bg-[#FFF7F5]" : "border-[#E7DDD9] bg-white"}`}><Icon className={`h-4 w-4 ${active ? "text-[#C66C72]" : "text-[#8E817C]"}`} strokeWidth={1.5} /><p className="mt-2 text-[8px] font-semibold text-[#514540]">{method.name_ar || method.name}</p><p className="mt-0.5 text-[6px] text-[#A0938E]">{method.name}</p>{active && <span className="absolute left-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4777D]"><Check className="h-2.5 w-2.5 text-white" /></span>}</button>; })}</div> : <div className="rounded-[10px] bg-[#F8F5F3] px-3 py-3 text-[7px] text-[#887A75]">لا توجد طرق دفع مفعلة من لوحة الإدارة.</div>}</div>{isBankPayment && bankAccounts.length > 0 && <div className="mt-5 rounded-[12px] border border-[#EAE0DC] bg-[#FFFCFB] p-3"><p className="mb-2.5 text-[7px] text-[#958781]">حول المبلغ إلى أحد الحسابات التالية:</p><div className="space-y-2">{bankAccounts.map((account, index) => <div key={`${account.account}-${index}`} className="flex items-center justify-between gap-3 rounded-[9px] border border-[#ECE3DF] bg-white p-3"><div className="min-w-0"><p className="truncate text-[8px] font-semibold text-[#514540]">{account.bank}</p>{account.name && <p className="mt-0.5 truncate text-[6px] text-[#A0938E]">{account.name}</p>}<p dir="ltr" className="mt-1 truncate text-left font-mono text-[7px] text-[#776A65]">{account.account}</p></div><button type="button" onClick={() => { navigator.clipboard.writeText(account.account); toast({ title: "تم نسخ رقم الحساب" }); }} aria-label="نسخ رقم الحساب" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#E5DAD6] bg-white text-[#A76A6D] active:bg-[#FFF6F4]"><Copy className="h-3.5 w-3.5" strokeWidth={1.5} /></button></div>)}</div></div>}<div className="mt-5 border-t border-[#EEE4E0] pt-4"><div className="mb-2 flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5 text-[#A76A6D]" strokeWidth={1.5} /><span className="text-[8px] font-semibold text-[#574A45]">كود الخصم</span><span className="text-[6px] text-[#A0938E]">اختياري</span></div>{appliedCoupon ? <div className="flex min-h-[46px] items-center justify-between gap-3 rounded-[10px] border border-[#CFE1D2] bg-[#F5FAF6] px-3"><div className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6F9576]"><Check className="h-3 w-3 text-white" /></span><div className="min-w-0"><p className="truncate text-[8px] font-semibold text-[#54745A]">{appliedCoupon}</p><p className="mt-0.5 text-[6px] text-[#77907B]">خصم {formatCurrency(discountAmount)}</p></div></div><button type="button" onClick={removeCoupon} className="flex h-7 items-center gap-1 rounded-[7px] px-2 text-[7px] font-medium text-[#A45D5D] active:bg-white"><X className="h-3 w-3" />إزالة</button></div> : <div className="flex gap-2"><input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void applyCoupon(); }} placeholder="أدخل الكود" dir="ltr" className="h-10 min-w-0 flex-1 rounded-[9px] border border-[#E6DCD8] bg-white px-3 text-left text-[8px] uppercase text-[#50433F] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" /><button type="button" onClick={applyCoupon} className="h-10 shrink-0 rounded-[9px] border border-[#D9AEAA] bg-white px-4 text-[8px] font-semibold text-[#A95B61] active:bg-[#FFF7F5]">تطبيق</button></div>}</div></div>}
            {currentStep === 3 && <div className="p-4 md:p-5"><div className="mb-5 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]"><Check className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.7} /></span><div><h2 className="text-[11px] font-semibold text-[#483C38]">مراجعة الطلب</h2><p className="mt-0.5 text-[7px] text-[#A0938E]">راجع معلوماتك قبل التأكيد النهائي.</p></div></div><div className="border-b border-[#EEE5E1] py-3 first:pt-0"><p className="text-[7px] font-medium text-[#A0938E]">معلومات التواصل</p><p className="mt-1.5 text-[9px] font-medium text-[#514540]">{customer?.name || formData.name}</p><p dir="ltr" className="mt-1 text-right text-[7px] text-[#847671]">{customer?.phone || formData.phone}</p></div><div className="border-b border-[#EEE5E1] py-3"><p className="text-[7px] font-medium text-[#A0938E]">عنوان التوصيل</p><p className="mt-1.5 text-[9px] leading-5 text-[#514540]">{formData.city} — {formData.address}</p>{formData.notes && <p className="mt-1 text-[7px] leading-5 text-[#948680]">ملاحظات: {formData.notes}</p>}</div><div className="border-b border-[#EEE5E1] py-3"><p className="text-[7px] font-medium text-[#A0938E]">الشحن والدفع</p><p className="mt-1.5 text-[9px] text-[#514540]">{selectedCompany?.name || "—"} <span className="mx-1 text-[#C9BDB8]">•</span> {selectedPaymentMethod?.name_ar || selectedPaymentMethod?.name || "—"}</p>{appliedCoupon && <p className="mt-1.5 text-[7px] font-medium text-[#5C8063]">كوبون {appliedCoupon} — خصم {formatCurrency(discountAmount)}</p>}</div><div className="pt-3"><p className="mb-3 text-[7px] font-medium text-[#A0938E]">المنتجات</p><div className="space-y-3">{cart.map((item, index) => { const price = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price; const accessoriesTotal = item.selectedAccessories?.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) || 0; const color = item.selectedColor || item.variantColor; return <div key={`${item.product.id}-${index}`} className="flex items-center gap-3"><div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#EEE7E4] bg-[#F7F5F3] p-1"><img src={optimizeImage(item.product.images?.[0] || "/placeholder.svg", 200, 80)} alt={item.product.nameAr || ""} loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-contain object-center" /></div><div className="min-w-0 flex-1"><p className="truncate text-[8px] font-medium text-[#514540]">{item.product.nameAr}</p><div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[6px] text-[#958781]"><span>الكمية: {item.quantity}</span>{item.selectedSize && <span>المقاس: {item.selectedSize}</span>}{color && <span>اللون: {color}</span>}</div></div><span className="shrink-0 text-[8px] font-semibold text-[#A95B61]">{formatCurrency((price + accessoriesTotal) * item.quantity)}</span></div>; })}</div></div></div>}
          </section><div className="mt-4 flex items-center justify-between gap-2"><button type="button" onClick={prevStep} disabled={currentStep === 0} className="flex h-11 min-w-[88px] items-center justify-center gap-1.5 rounded-[10px] border border-[#E4DAD6] bg-white px-4 text-[8px] font-semibold text-[#625550] disabled:cursor-not-allowed disabled:opacity-35"><ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />السابق</button>{currentStep < STEPS.length - 1 ? <button type="button" onClick={nextStep} className="flex h-11 min-w-[138px] items-center justify-center gap-1.5 rounded-[10px] bg-[#D4777D] px-5 text-[8px] font-semibold text-white active:bg-[#C96B72]">التالي<ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} /></button> : <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex h-11 min-w-[155px] items-center justify-center gap-2 rounded-[10px] bg-[#D4777D] px-5 text-[8px] font-semibold text-white active:bg-[#C96B72] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{isSubmitting ? "جارٍ إنشاء الطلب" : "تأكيد الطلب النهائي"}</button>}</div></div>
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start"><div className="overflow-hidden rounded-[16px] border border-[#EAE0DC] bg-white"><div className="border-b border-[#EEE4E0] px-4 py-3.5"><div className="flex items-center justify-between"><h2 className="text-[10px] font-semibold text-[#483C38]">ملخص الطلب</h2><span className="text-[6px] text-[#A0938E]">{cart.length} {cart.length === 1 ? "منتج" : "منتجات"}</span></div></div><div className="max-h-[280px] overflow-y-auto px-4 [scrollbar-width:thin]">{cart.map((item, index) => { const price = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price; const accessoriesTotal = item.selectedAccessories?.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) || 0; const color = item.selectedColor || item.variantColor; return <div key={`${item.product.id}-${index}`} className={`flex items-center gap-3 py-3 ${index !== cart.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}><div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#EEE7E4] bg-[#F7F5F3] p-1"><img src={optimizeImage(item.product.images?.[0] || "/placeholder.svg", 200, 80)} alt={item.product.nameAr || ""} loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-contain object-center" /></div><div className="min-w-0 flex-1"><p className="truncate text-[7.5px] font-medium leading-5 text-[#514540]">{item.product.nameAr}</p><div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[6px] text-[#9A8C87]"><span>الكمية {item.quantity}</span>{item.selectedSize && <><span className="text-[#D0C6C2]">•</span><span>{item.selectedSize}</span></>}{color && <><span className="text-[#D0C6C2]">•</span><span className="max-w-[60px] truncate">{color}</span></>}</div></div><span className="shrink-0 text-[7px] font-semibold text-[#A95B61]">{formatCurrency((price + accessoriesTotal) * item.quantity)}</span></div>; })}</div><div className="border-t border-[#EEE4E0] px-4 py-4"><div className="space-y-2.5"><div className="flex items-center justify-between text-[7px] text-[#746661]"><span>المجموع الفرعي</span><span>{formatCurrency(subtotal)}</span></div><div className="flex items-center justify-between text-[7px] text-[#746661]"><span>رسوم التوصيل</span><span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : "—"}</span></div>{discountAmount > 0 && <div className="flex items-center justify-between text-[7px] font-medium text-[#63806A]"><span>الخصم</span><span>-{formatCurrency(discountAmount)}</span></div>}</div><div className="mt-4 flex items-end justify-between border-t border-[#EEE4E0] pt-3"><div><span className="block text-[7px] text-[#8F817C]">الإجمالي</span><span className="mt-0.5 block text-[6px] text-[#B1A49F]">شامل رسوم التوصيل</span></div><span className="text-[15px] font-bold text-[#B86168]">{formatCurrency(total)}</span></div></div></div><div className="mt-2 flex items-center justify-center gap-2 py-2 text-[6px] text-[#A0938E]"><Check className="h-3 w-3 text-[#6F9275]" strokeWidth={1.7} />بيانات طلبك تُرسل بشكل آمن</div></aside></div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
