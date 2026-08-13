import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface DeliveryCompany {
  id: string;
  name: string;
  base_fee: number;
  delivery_days: string | null;
}

interface BankAccount {
  bank: string;
  account: string;
  name: string;
}

interface CODRegion {
  id: string;
  region_name: string;
  region_name_ar: string;
}

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
  const currency = "ر.ي";

  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank">("cod");

  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(customer?.region || "");

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

  /* =========================================================
     CUSTOMER REGION
  ========================================================= */

  useEffect(() => {
    if (customer?.region) {
      setSelectedRegion(customer.region);
    }
  }, [customer?.region]);

  /* =========================================================
     ADDRESS OWNER
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;

      setAddressOwnerKey(data.user?.id || customer?.id || "guest");
    });

    return () => {
      mounted = false;
    };
  }, [customer?.id]);

  /* =========================================================
     SAVED ADDRESSES
  ========================================================= */

  useEffect(() => {
    const list = migrateLegacyCheckoutInfo(addressOwnerKey);

    setSavedAddresses(list);

    const defaultAddress = list.find((address) => address.isDefault) || list[0];

    if (!defaultAddress) return;

    setSelectedAddressId(defaultAddress.id);

    setFormData((current) => ({
      ...current,
      name: isGuestLike ? String(defaultAddress.name || current.name || "") : current.name,
      phone: isGuestLike ? String(defaultAddress.phone || current.phone || "") : current.phone,
      city: defaultAddress.city,
      address: defaultAddress.address,
      notes: defaultAddress.notes || "",
    }));
  }, [addressOwnerKey, isGuestLike]);

  /* =========================================================
     DELIVERY COMPANIES
  ========================================================= */

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["delivery-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_companies").select("id,name,base_fee,delivery_days,is_active").eq("is_active", true).order("name");

      if (error) throw error;

      return (data || []) as DeliveryCompany[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     SETTINGS
  ========================================================= */

  const { data: checkoutSettings = {} } = useQuery<Record<string, unknown>>({
    queryKey: ["checkout-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value").in("key", ["bank_accounts", "bank_accounts_ye", "bank_accounts_sa", "whatsapp", "whatsapp_ye", "whatsapp_sa"]);

      return Object.fromEntries((data || []).map((setting) => [setting.key, setting.value]));
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const bankAccounts = useMemo(() => {
    let value: any = checkoutSettings.bank_accounts ?? checkoutSettings.bank_accounts_ye ?? checkoutSettings.bank_accounts_sa;

    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return [] as BankAccount[];
      }
    }

    if (!Array.isArray(value)) {
      return [] as BankAccount[];
    }

    return value.map((item: any) => ({
      bank: String(item?.bank || ""),
      account: String(item?.account || ""),
      name: String(item?.name || ""),
    })) as BankAccount[];
  }, [checkoutSettings]);

  /* =========================================================
     COD REGIONS
  ========================================================= */

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

  /* =========================================================
     TOTALS
  ========================================================= */

  const selectedCompany = deliveryCompanies.find((company) => company.id === selectedDelivery);

  const deliveryFee = selectedCompany?.base_fee || 0;

  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  /* =========================================================
     COST TOTAL FOR COUPON
  ========================================================= */

  const getCostPriceTotal = () => {
    return cart.reduce((totalCost, item) => {
      const costPrice = item.product.costPrice || item.product.price;

      const accessoriesTotal = item.selectedAccessories?.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) || 0;

      return totalCost + (costPrice + accessoriesTotal) * item.quantity;
    }, 0);
  };

  /* =========================================================
     COUPON
  ========================================================= */

  const applyCoupon = async () => {
    const normalized = couponCode.trim().toUpperCase();

    if (!normalized) {
      toast({
        title: "أدخل كود الخصم",
        variant: "destructive",
      });

      return;
    }

    const costPriceTotal = getCostPriceTotal();

    try {
      const { data: couponData, error } = await supabase.from("coupons").select("code,type,value").eq("is_active", true).limit(100);

      if (error) throw error;

      const match = couponData?.find((coupon) => coupon.code?.trim().toUpperCase() === normalized);

      if (!match) {
        setDiscountAmount(0);
        setAppliedCoupon(null);

        toast({
          title: "الكود غير صالح",
          description: "كود الخصم غير موجود.",
          variant: "destructive",
        });

        return;
      }

      const coupon = match as {
        type: "percentage" | "fixed";
        value: number;
      };

      let discount = coupon.type === "percentage" ? (costPriceTotal * coupon.value) / 100 : coupon.value;

      discount = Math.min(discount, subtotal);

      setDiscountAmount(discount);
      setAppliedCoupon(normalized);

      toast({
        title: "تم تطبيق الكوبون",
        description: `خصم ${discount.toFixed(2)} ${currency}`,
      });
    } catch {
      setDiscountAmount(0);
      setAppliedCoupon(null);

      toast({
        title: "تعذر التحقق من الكوبون",
        description: "حاول مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setDiscountAmount(0);
    setAppliedCoupon(null);

    toast({
      title: "تمت إزالة الكوبون",
    });
  };

  /* =========================================================
     ADDRESS PICKER
  ========================================================= */

  const selectedSavedAddress = savedAddresses.find((address) => address.id === selectedAddressId);

  const selectSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    setAddressPickerOpen(false);

    if (!id) {
      setFormData((current) => ({
        ...current,
        city: "",
        address: "",
        notes: "",
      }));

      return;
    }

    const address = savedAddresses.find((item) => item.id === id);

    if (!address) return;

    setFormData((current) => ({
      ...current,
      name: isGuestLike ? String(address.name || current.name || "") : current.name,
      phone: isGuestLike ? String(address.phone || current.phone || "") : current.phone,
      city: address.city,
      address: address.address,
      notes: address.notes || "",
    }));
  };

  /* =========================================================
     SECURE ORDER
  ========================================================= */

  const createSecureOrder = async (items: unknown[]) => {
    const { data, error } = await (supabase as any).rpc("create_secure_order", {
      p_customer_id: customer?.id === "guest" ? null : customer?.id || null,
      p_customer_name: String(customer?.name || formData.name || "").trim(),
      p_customer_phone: String(customer?.phone || formData.phone || "").trim(),
      p_customer_address: formData.address.trim(),
      p_customer_city: formData.city.trim(),
      p_customer_region: customer?.region || selectedRegion || null,
      p_customer_notes: formData.notes.trim() || null,
      p_country: "YE",
      p_items: items,
      p_subtotal: subtotal,
      p_delivery_fee: deliveryFee,
      p_total: total,
      p_payment_method: paymentMethod,
      p_currency_mode: currencyMode,
      p_currency_code: currencyMode,
      p_exchange_rate_snapshot: 1,
      p_total_base: total,
      p_coupon_code: appliedCoupon || null,
      p_discount_amount: discountAmount,
    });

    if (error) {
      console.error("RPC ERROR FULL:", error);
      throw error;
    }

    return data;
  };

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validateStep = (step: number) => {
    if (step === 0) {
      const name = String(customer?.name || formData.name || "").trim();
      const phone = String(customer?.phone || formData.phone || "").trim();

      if (isGuestLike && (!name || !phone)) {
        toast({
          title: "الاسم ورقم الهاتف مطلوبان",
          variant: "destructive",
        });

        return false;
      }
    }

    if (step === 1) {
      if (!formData.city.trim() || !formData.address.trim()) {
        toast({
          title: "المدينة والعنوان مطلوبان",
          variant: "destructive",
        });

        return false;
      }
    }

    if (step === 2) {
      if (!selectedDelivery) {
        toast({
          title: "اختر شركة التوصيل",
          variant: "destructive",
        });

        return false;
      }

      if (paymentMethod === "cod" && codRegions.length > 0 && !selectedRegion) {
        toast({
          title: "اختر منطقة الاستلام",
          variant: "destructive",
        });

        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;

    setCurrentStep((current) => Math.min(current + 1, STEPS.length - 1));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const prevStep = () => {
    setCurrentStep((current) => Math.max(current - 1, 0));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     SAVE ADDRESS
  ========================================================= */

  const saveAddressToLocal = () => {
    upsertSavedAddress(addressOwnerKey, {
      id: selectedAddressId || `addr-${Date.now()}`,
      label: selectedSavedAddress?.label || `عنوان ${savedAddresses.length + 1}`,
      name: String(customer?.name || formData.name || "").trim(),
      phone: String(customer?.phone || formData.phone || "").trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      notes: formData.notes.trim(),
      isDefault: true,
    });
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      return;
    }

    setIsSubmitting(true);

    const rawOrderItems = cart.map((item) => {
      const basePrice = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price;

      const accessoriesTotal = item.selectedAccessories?.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) || 0;

      return {
        product_id: item.product.id,
        product_name: item.product.nameAr,
        product_image: item.product.images?.[0] || "",
        quantity: item.quantity,
        price: basePrice + accessoriesTotal,
        selected_size: item.selectedSize || null,
        selected_color: item.selectedColor || item.variantColor || null,
        selected_accessories: (item.selectedAccessories || []).map((accessory) => ({
          name: String((accessory as any).name || ""),
          name_ar: String((accessory as any).name_ar || (accessory as any).name || ""),
          price: Number((accessory as any).price) || 0,
          quantity: Number((accessory as any).quantity) || 1,
          image_url: String((accessory as any).image_url || ""),
        })),
      };
    });

    const validation = orderItemsSchema.safeParse(rawOrderItems);

    if (!validation.success) {
      console.error("ORDER VALIDATION:", validation.error);

      toast({
        title: "بيانات الطلب غير صحيحة",
        description: "تحقق من المنتجات وحاول مرة أخرى.",
        variant: "destructive",
      });

      setIsSubmitting(false);

      return;
    }

    try {
      const customerName = String(customer?.name || formData.name || "").trim();
      const customerPhone = String(customer?.phone || formData.phone || "").trim();

      saveAddressToLocal();

      const createdOrder = await createSecureOrder(validation.data);

      const regionData = codRegions.find((region) => region.id === selectedRegion);

      const orderData = {
        orderId: createdOrder.order_id,
        orderNumber: createdOrder.order_number,
        trackingToken: createdOrder.tracking_token,
        customerName: customerName || "عميل",
        customerPhone,
        customerAddress: formData.address || "-",
        customerCity: formData.city || "",
        customerNotes: formData.notes || "",
        items: validation.data,
        subtotal: Number(createdOrder.subtotal),
        deliveryFee: Number(createdOrder.delivery_fee),
        discountAmount: Number(createdOrder.discount_amount),
        couponCode: Number(createdOrder.discount_amount) > 0 ? appliedCoupon : null,
        total: Number(createdOrder.total),
        paymentMethod,
        deliveryCompany: createdOrder.delivery_company || selectedCompany?.name || "",
        selectedRegion: paymentMethod === "cod" && regionData ? regionData.region_name_ar : customer?.region || null,
        country: "GLOBAL",
        currencyMode: createdOrder.currency_mode || currencyMode,
        createdAt: createdOrder.created_at || new Date().toISOString(),
      };

      clearCart();

      navigate("/order-confirmation", {
        state: {
          orderData,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل إرسال الطلب";

      toast({
        title: "تعذر إنشاء الطلب",
        description: message,
        variant: "destructive",
      });

      setIsSubmitting(false);
    }
  };

  /* =========================================================
     EMPTY CART
  ========================================================= */

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
        <Navbar />

        <CartDrawer />

        <main className="flex min-h-[65vh] items-center justify-center px-4 py-16">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAECE9]">
              <ShoppingBag className="h-5 w-5 text-[#C66C72]" strokeWidth={1.4} />
            </span>

            <h1 className="mt-4 text-[18px] font-semibold text-[#403633]">السلة فارغة</h1>

            <p className="mt-1.5 text-[8px] text-[#9B8D88]">أضف بعض المنتجات قبل إتمام الطلب.</p>

            <button type="button" onClick={() => navigate("/products")} className="mt-5 h-10 rounded-[10px] bg-[#D4777D] px-6 text-[9px] font-semibold text-white">
              تصفح المنتجات
            </button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
      <Navbar />

      <CartDrawer />

      <main className="pb-12 pt-5 md:pb-16 md:pt-7">
        <div className="mx-auto w-full max-w-[1120px] px-3 md:px-6">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-5 md:mb-7">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">CHECKOUT</span>
            </div>

            <h1 className="mt-1.5 text-[19px] font-semibold tracking-[-0.025em] text-[#3E3431] md:text-[26px]">إتمام الطلب</h1>

            <p className="mt-1 text-[8px] text-[#9D8F8A]">بقيت خطوات بسيطة لإتمام طلبك.</p>
          </div>

          {/* =================================================
              STEPPER
          ================================================= */}

          <div className="mb-6 overflow-hidden rounded-[14px] border border-[#EAE0DC] bg-white px-2 py-3 md:px-5">
            <div className="flex items-start">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const done = index < currentStep;
                const active = index === currentStep;

                return (
                  <div key={step.key} className="flex min-w-0 flex-1 items-start">
                    <div className="flex min-w-[52px] flex-col items-center">
                      <button type="button" onClick={() => { if (index < currentStep) setCurrentStep(index); }} disabled={index > currentStep} className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${done ? "border-[#D4777D] bg-[#D4777D] text-white" : active ? "border-[#D4777D] bg-[#FFF5F3] text-[#B86168]" : "border-[#E8DEDA] bg-[#FAF8F7] text-[#B0A49F]"}`}>
                        {done ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      </button>

                      <span className={`mt-1.5 whitespace-nowrap text-[6px] font-medium md:text-[7px] ${active || done ? "text-[#685853]" : "text-[#A99B96]"}`}>{step.label}</span>
                    </div>

                    {index < STEPS.length - 1 && <div className={`mt-4 h-px flex-1 ${index < currentStep ? "bg-[#D9AAA7]" : "bg-[#EAE2DF]"}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
            {/* =================================================
                STEP CONTENT
            ================================================= */}

            <div className="min-w-0">
              <section className="overflow-hidden rounded-[16px] border border-[#EAE0DC] bg-white">
                {/* =================================================
                    STEP 1
                ================================================= */}

                {currentStep === 0 && (
                  <div className="p-4 md:p-5">
                    <div className="mb-5 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]">
                        <User className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} />
                      </span>

                      <div>
                        <h2 className="text-[11px] font-semibold text-[#483C38]">معلوماتك الشخصية</h2>
                        <p className="mt-0.5 text-[7px] text-[#A0938E]">بيانات التواصل الخاصة بالطلب.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">الاسم الكامل *</label>

                        <input value={isGuestLike ? formData.name : customer?.name || ""} onChange={(event) => { if (isGuestLike) setFormData((current) => ({ ...current, name: event.target.value })); }} disabled={!isGuestLike} placeholder="أدخل اسمك" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA] disabled:bg-[#F7F4F2] disabled:text-[#8E817C]" />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">رقم الهاتف *</label>

                        <input value={isGuestLike ? formData.phone : customer?.phone || ""} onChange={(event) => { if (isGuestLike) setFormData((current) => ({ ...current, phone: event.target.value })); }} disabled={!isGuestLike} placeholder="رقم الهاتف" dir="ltr" inputMode="tel" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-left text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA] disabled:bg-[#F7F4F2] disabled:text-[#8E817C]" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">البريد الإلكتروني <span className="font-normal text-[#AA9D98]">اختياري</span></label>

                      <input value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" dir="ltr" inputMode="email" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-left text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" />
                    </div>
                  </div>
                )}

                {/* =================================================
                    STEP 2
                ================================================= */}

                {currentStep === 1 && (
                  <div className="p-4 md:p-5">
                    <div className="mb-5 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]">
                        <MapPin className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} />
                      </span>

                      <div>
                        <h2 className="text-[11px] font-semibold text-[#483C38]">عنوان التوصيل</h2>
                        <p className="mt-0.5 text-[7px] text-[#A0938E]">أدخل المكان الذي تريد استلام الطلب فيه.</p>
                      </div>
                    </div>

                    {/* SAVED ADDRESS */}

                    {savedAddresses.length > 0 && (
                      <div className="relative mb-4">
                        <label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">عنوان محفوظ</label>

                        <button type="button" onClick={() => setAddressPickerOpen((current) => !current)} className={`flex h-11 w-full items-center justify-between rounded-[10px] border bg-white px-3 text-right text-[9px] ${addressPickerOpen ? "border-[#D9AEAA]" : "border-[#E6DCD8]"}`}>
                          <div className="min-w-0">
                            {selectedSavedAddress ? (
                              <>
                                <p className="truncate font-medium text-[#50433F]">{selectedSavedAddress.label}</p>
                                <p className="mt-0.5 truncate text-[7px] text-[#A0938E]">{selectedSavedAddress.city} — {selectedSavedAddress.address}</p>
                              </>
                            ) : (
                              <span className="text-[#A0938E]">إضافة عنوان جديد</span>
                            )}
                          </div>

                          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#9B8E89] transition-transform ${addressPickerOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                        </button>

                        {addressPickerOpen && (
                          <>
                            <button type="button" onClick={() => setAddressPickerOpen(false)} aria-label="إغلاق قائمة العناوين" className="fixed inset-0 z-[60] cursor-default" />

                            <div className="absolute inset-x-0 top-[68px] z-[70] overflow-hidden rounded-[12px] border border-[#E5DAD6] bg-white p-1.5 shadow-[0_12px_32px_rgba(50,35,30,0.10)]">
                              <button type="button" onClick={() => selectSavedAddress("")} className={`flex min-h-[42px] w-full items-center justify-between rounded-[8px] px-3 text-right text-[8px] ${!selectedAddressId ? "bg-[#FFF5F3] text-[#A95B61]" : "text-[#625550]"}`}>
                                <span>عنوان جديد</span>
                                {!selectedAddressId && <Check className="h-3.5 w-3.5" />}
                              </button>

                              {savedAddresses.map((address) => {
                                const active = selectedAddressId === address.id;

                                return (
                                  <button key={address.id} type="button" onClick={() => selectSavedAddress(address.id)} className={`flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[8px] px-3 text-right ${active ? "bg-[#FFF5F3]" : "active:bg-[#FAF7F5]"}`}>
                                    <div className="min-w-0">
                                      <p className={`truncate text-[8px] font-medium ${active ? "text-[#A95B61]" : "text-[#514540]"}`}>{address.label}</p>
                                      <p className="mt-1 truncate text-[6px] text-[#A0938E]">{address.city} — {address.address}</p>
                                    </div>

                                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#C96F79]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">المدينة *</label>

                        <input value={formData.city} onChange={(event) => { setSelectedAddressId(""); setFormData((current) => ({ ...current, city: event.target.value })); }} placeholder="مثال: عدن" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">العنوان بالتفصيل *</label>

                        <input value={formData.address} onChange={(event) => { setSelectedAddressId(""); setFormData((current) => ({ ...current, address: event.target.value })); }} placeholder="الحي، الشارع، رقم المبنى" className="h-11 w-full rounded-[10px] border border-[#E6DCD8] bg-white px-3 text-[9px] text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1.5 block text-[8px] font-medium text-[#5B4E49]">ملاحظات إضافية <span className="font-normal text-[#AA9D98]">اختياري</span></label>

                      <textarea value={formData.notes} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="وقت التسليم المفضل، معلم قريب..." className="w-full resize-none rounded-[10px] border border-[#E6DCD8] bg-white px-3 py-3 text-[9px] leading-6 text-[#483C38] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" />
                    </div>
                  </div>
                )}

                {/* =================================================
                    STEP 3
                ================================================= */}

                {currentStep === 2 && (
                  <div className="p-4 md:p-5">
                    <div className="mb-5 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]">
                        <CreditCard className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} />
                      </span>

                      <div>
                        <h2 className="text-[11px] font-semibold text-[#483C38]">الشحن والدفع</h2>
                        <p className="mt-0.5 text-[7px] text-[#A0938E]">اختر شركة التوصيل وطريقة الدفع.</p>
                      </div>
                    </div>

                    {/* DELIVERY */}

                    <div>
                      <div className="mb-2.5 flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-[#A76A6D]" strokeWidth={1.5} />
                        <span className="text-[8px] font-semibold text-[#574A45]">شركة التوصيل *</span>
                      </div>

                      {deliveryCompanies.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {deliveryCompanies.map((company) => {
                            const active = selectedDelivery === company.id;

                            return (
                              <button key={company.id} type="button" onClick={() => setSelectedDelivery(company.id)} className={`relative flex min-h-[68px] items-center justify-between rounded-[11px] border p-3 text-right ${active ? "border-[#D9A7A4] bg-[#FFF7F5]" : "border-[#E7DDD9] bg-white active:bg-[#FAF8F7]"}`}>
                                <div>
                                  <p className={`text-[9px] font-semibold ${active ? "text-[#A95B61]" : "text-[#514540]"}`}>{company.name}</p>

                                  <p className="mt-1 text-[7px] text-[#9E918C]">
                                    {company.base_fee.toFixed(0)} {currency}
                                    {company.delivery_days ? ` • ${company.delivery_days}` : ""}
                                  </p>
                                </div>

                                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-[#D4777D] bg-[#D4777D]" : "border-[#D8CECA]"}`}>
                                  {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.2} />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-[10px] bg-[#F8F5F3] px-3 py-3">
                          <AlertCircle className="h-3.5 w-3.5 text-[#9B8982]" />
                          <span className="text-[7px] text-[#887A75]">لا توجد شركات توصيل متاحة حالياً.</span>
                        </div>
                      )}
                    </div>

                    {/* PAYMENT */}

                    <div className="mt-5">
                      <p className="mb-2.5 text-[8px] font-semibold text-[#574A45]">طريقة الدفع *</p>

                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setPaymentMethod("cod")} className={`relative flex min-h-[72px] flex-col items-start justify-center rounded-[11px] border p-3 text-right ${paymentMethod === "cod" ? "border-[#D9A7A4] bg-[#FFF7F5]" : "border-[#E7DDD9] bg-white"}`}>
                          <Banknote className={`h-4 w-4 ${paymentMethod === "cod" ? "text-[#C66C72]" : "text-[#8E817C]"}`} strokeWidth={1.5} />

                          <p className="mt-2 text-[8px] font-semibold text-[#514540]">الدفع عند الاستلام</p>

                          <p className="mt-0.5 text-[6px] text-[#A0938E]">Cash on Delivery</p>

                          {paymentMethod === "cod" && <span className="absolute left-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4777D]"><Check className="h-2.5 w-2.5 text-white" /></span>}
                        </button>

                        <button type="button" onClick={() => setPaymentMethod("bank")} className={`relative flex min-h-[72px] flex-col items-start justify-center rounded-[11px] border p-3 text-right ${paymentMethod === "bank" ? "border-[#D9A7A4] bg-[#FFF7F5]" : "border-[#E7DDD9] bg-white"}`}>
                          <CreditCard className={`h-4 w-4 ${paymentMethod === "bank" ? "text-[#C66C72]" : "text-[#8E817C]"}`} strokeWidth={1.5} />

                          <p className="mt-2 text-[8px] font-semibold text-[#514540]">تحويل بنكي</p>

                          <p className="mt-0.5 text-[6px] text-[#A0938E]">Bank Transfer</p>

                          {paymentMethod === "bank" && <span className="absolute left-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4777D]"><Check className="h-2.5 w-2.5 text-white" /></span>}
                        </button>
                      </div>
                    </div>

                    {/* COD REGION */}

                    {paymentMethod === "cod" && codRegions.length > 0 && !customer?.region && (
                      <div className="mt-5 rounded-[12px] border border-[#EAE0DC] bg-[#FFFCFB] p-3">
                        <div className="mb-3 flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} />
                          <span className="text-[8px] font-semibold text-[#574A45]">منطقة الاستلام *</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {codRegions.map((region) => {
                            const active = selectedRegion === region.id;

                            return (
                              <button key={region.id} type="button" onClick={() => setSelectedRegion(region.id)} className={`min-h-[36px] rounded-[8px] border px-2 text-[7px] font-medium ${active ? "border-[#D4777D] bg-[#D4777D] text-white" : "border-[#E4DAD6] bg-white text-[#625550] active:bg-[#FFF7F5]"}`}>
                                {region.region_name_ar}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BANK */}

                    {paymentMethod === "bank" && bankAccounts.length > 0 && (
                      <div className="mt-5 rounded-[12px] border border-[#EAE0DC] bg-[#FFFCFB] p-3">
                        <p className="mb-2.5 text-[7px] text-[#958781]">حول المبلغ إلى أحد الحسابات التالية:</p>

                        <div className="space-y-2">
                          {bankAccounts.map((account, index) => (
                            <div key={`${account.account}-${index}`} className="flex items-center justify-between gap-3 rounded-[9px] border border-[#ECE3DF] bg-white p-3">
                              <div className="min-w-0">
                                <p className="truncate text-[8px] font-semibold text-[#514540]">{account.bank}</p>

                                {account.name && <p className="mt-0.5 truncate text-[6px] text-[#A0938E]">{account.name}</p>}

                                <p dir="ltr" className="mt-1 truncate text-left font-mono text-[7px] text-[#776A65]">{account.account}</p>
                              </div>

                              <button type="button" onClick={() => { navigator.clipboard.writeText(account.account); toast({ title: "تم نسخ رقم الحساب" }); }} aria-label="نسخ رقم الحساب" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#E5DAD6] bg-white text-[#A76A6D] active:bg-[#FFF6F4]">
                                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COUPON */}

                    <div className="mt-5 border-t border-[#EEE4E0] pt-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5 text-[#A76A6D]" strokeWidth={1.5} />
                        <span className="text-[8px] font-semibold text-[#574A45]">كود الخصم</span>
                        <span className="text-[6px] text-[#A0938E]">اختياري</span>
                      </div>

                      {appliedCoupon ? (
                        <div className="flex min-h-[46px] items-center justify-between gap-3 rounded-[10px] border border-[#CFE1D2] bg-[#F5FAF6] px-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6F9576]">
                              <Check className="h-3 w-3 text-white" />
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-[8px] font-semibold text-[#54745A]">{appliedCoupon}</p>
                              <p className="mt-0.5 text-[6px] text-[#77907B]">خصم {discountAmount.toFixed(2)} {currency}</p>
                            </div>
                          </div>

                          <button type="button" onClick={removeCoupon} className="flex h-7 items-center gap-1 rounded-[7px] px-2 text-[7px] font-medium text-[#A45D5D] active:bg-white">
                            <X className="h-3 w-3" />
                            إزالة
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void applyCoupon(); }} placeholder="أدخل الكود" dir="ltr" className="h-10 min-w-0 flex-1 rounded-[9px] border border-[#E6DCD8] bg-white px-3 text-left text-[8px] uppercase text-[#50433F] outline-none placeholder:text-[#ADA19C] focus:border-[#D9AEAA]" />

                          <button type="button" onClick={applyCoupon} className="h-10 shrink-0 rounded-[9px] border border-[#D9AEAA] bg-white px-4 text-[8px] font-semibold text-[#A95B61] active:bg-[#FFF7F5]">
                            تطبيق
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================
                    STEP 4
                ================================================= */}

                {currentStep === 3 && (
                  <div className="p-4 md:p-5">
                    <div className="mb-5 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAECE9]">
                        <Check className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.7} />
                      </span>

                      <div>
                        <h2 className="text-[11px] font-semibold text-[#483C38]">مراجعة الطلب</h2>
                        <p className="mt-0.5 text-[7px] text-[#A0938E]">راجع معلوماتك قبل التأكيد النهائي.</p>
                      </div>
                    </div>

                    {/* CONTACT */}

                    <div className="border-b border-[#EEE5E1] py-3 first:pt-0">
                      <p className="text-[7px] font-medium text-[#A0938E]">معلومات التواصل</p>

                      <p className="mt-1.5 text-[9px] font-medium text-[#514540]">{customer?.name || formData.name}</p>

                      <p dir="ltr" className="mt-1 text-right text-[7px] text-[#847671]">{customer?.phone || formData.phone}</p>
                    </div>

                    {/* ADDRESS */}

                    <div className="border-b border-[#EEE5E1] py-3">
                      <p className="text-[7px] font-medium text-[#A0938E]">عنوان التوصيل</p>

                      <p className="mt-1.5 text-[9px] leading-5 text-[#514540]">{formData.city} — {formData.address}</p>

                      {formData.notes && <p className="mt-1 text-[7px] leading-5 text-[#948680]">ملاحظات: {formData.notes}</p>}
                    </div>

                    {/* SHIPPING */}

                    <div className="border-b border-[#EEE5E1] py-3">
                      <p className="text-[7px] font-medium text-[#A0938E]">الشحن والدفع</p>

                      <p className="mt-1.5 text-[9px] text-[#514540]">{selectedCompany?.name || "—"} <span className="mx-1 text-[#C9BDB8]">•</span> {paymentMethod === "cod" ? "الدفع عند الاستلام" : "تحويل بنكي"}</p>

                      {appliedCoupon && <p className="mt-1.5 text-[7px] font-medium text-[#5C8063]">كوبون {appliedCoupon} — خصم {discountAmount.toFixed(2)} {currency}</p>}
                    </div>

                    {/* PRODUCTS */}

                    <div className="pt-3">
                      <p className="mb-3 text-[7px] font-medium text-[#A0938E]">المنتجات</p>

                      <div className="space-y-3">
                        {cart.map((item, index) => {
                          const price = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price;
                          const accessoriesTotal = item.selectedAccessories?.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) || 0;
                          const color = item.selectedColor || item.variantColor;

                          return (
                            <div key={`${item.product.id}-${index}`} className="flex items-start gap-3">
                              <div className="h-[58px] w-[48px] shrink-0 overflow-hidden rounded-[8px] bg-[#F5F3F1]">
                                <img src={optimizeImage(item.product.images?.[0] || "/placeholder.svg", 180, 78)} alt={item.product.nameAr || ""} loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover object-bottom" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[8px] font-medium text-[#514540]">{item.product.nameAr}</p>

                                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[6px] text-[#958781]">
                                  <span>الكمية: {item.quantity}</span>

                                  {item.selectedSize && <span>المقاس: {item.selectedSize}</span>}

                                  {color && <span>اللون: {color}</span>}
                                </div>
                              </div>

                              <span className="shrink-0 text-[8px] font-semibold text-[#A95B61]">{((price + accessoriesTotal) * item.quantity).toFixed(0)} {currency}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* =================================================
                  NAVIGATION
              ================================================= */}

              <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" onClick={prevStep} disabled={currentStep === 0} className="flex h-11 min-w-[88px] items-center justify-center gap-1.5 rounded-[10px] border border-[#E4DAD6] bg-white px-4 text-[8px] font-semibold text-[#625550] disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  السابق
                </button>

                {currentStep < STEPS.length - 1 ? (
                  <button type="button" onClick={nextStep} className="flex h-11 min-w-[110px] items-center justify-center gap-1.5 rounded-[10px] bg-[#D4777D] px-5 text-[8px] font-semibold text-white active:bg-[#C96B72]">
                    التالي
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex h-11 min-w-[145px] items-center justify-center gap-2 rounded-[10px] bg-[#D4777D] px-5 text-[8px] font-semibold text-white active:bg-[#C96B72] disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isSubmitting ? "جارٍ إنشاء الطلب" : "تأكيد الطلب النهائي"}
                  </button>
                )}
              </div>
            </div>

            {/* =================================================
                SUMMARY
            ================================================= */}

            <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-[16px] border border-[#EAE0DC] bg-white">
                <div className="border-b border-[#EEE4E0] px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-semibold text-[#483C38]">ملخص الطلب</h2>

                    <span className="text-[6px] text-[#A0938E]">{cart.length} {cart.length === 1 ? "منتج" : "منتجات"}</span>
                  </div>
                </div>

                {/* PRODUCTS */}

                <div className="max-h-[260px] overflow-y-auto px-4 [scrollbar-width:thin]">
                  {cart.map((item, index) => {
                    const price = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price;

                    const accessoriesTotal = item.selectedAccessories?.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) || 0;

                    return (
                      <div key={`${item.product.id}-${index}`} className={`flex items-center gap-2.5 py-3 ${index !== cart.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                        <div className="h-[50px] w-[42px] shrink-0 overflow-hidden rounded-[7px] bg-[#F5F3F1]">
                          <img src={optimizeImage(item.product.images?.[0] || "/placeholder.svg", 160, 76)} alt={item.product.nameAr || ""} loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover object-bottom" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[7px] font-medium text-[#514540]">{item.product.nameAr}</p>

                          <p className="mt-1 text-[6px] text-[#9A8C87]">الكمية {item.quantity}</p>
                        </div>

                        <span className="shrink-0 text-[7px] font-semibold text-[#A95B61]">{((price + accessoriesTotal) * item.quantity).toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* TOTALS */}

                <div className="border-t border-[#EEE4E0] px-4 py-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[7px] text-[#746661]">
                      <span>المجموع الفرعي</span>
                      <span>{subtotal.toFixed(2)} {currency}</span>
                    </div>

                    <div className="flex items-center justify-between text-[7px] text-[#746661]">
                      <span>رسوم التوصيل</span>
                      <span>{deliveryFee > 0 ? `${deliveryFee.toFixed(2)} ${currency}` : "—"}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-[7px] font-medium text-[#63806A]">
                        <span>الخصم</span>
                        <span>-{discountAmount.toFixed(2)} {currency}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-[#EEE4E0] pt-3">
                    <div>
                      <span className="block text-[7px] text-[#8F817C]">الإجمالي</span>
                      <span className="mt-0.5 block text-[6px] text-[#B1A49F]">شامل رسوم التوصيل</span>
                    </div>

                    <span className="text-[15px] font-bold text-[#B86168]">{total.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>

              {/* SECURITY */}

              <div className="mt-2 flex items-center justify-center gap-2 py-2 text-[6px] text-[#A0938E]">
                <Check className="h-3 w-3 text-[#6F9275]" strokeWidth={1.7} />
                بيانات طلبك تُرسل بشكل آمن
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;