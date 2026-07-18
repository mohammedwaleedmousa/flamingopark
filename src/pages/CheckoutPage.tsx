import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Banknote, Truck, Copy, Check, ChevronLeft, ChevronRight,
  User, MapPin, ShoppingBag, Loader2, AlertCircle, Ticket, X,
} from "lucide-react";
import {
  SavedAddress, migrateLegacyCheckoutInfo, upsertSavedAddress,
} from "@/lib/savedAddresses";

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
  selected_accessories: z.array(orderAccessorySchema).max(50),
});
const orderItemsSchema = z.array(orderItemSchema).min(1).max(100);

interface DeliveryCompany { id: string; name: string; base_fee: number; delivery_days: string | null; }
interface BankAccount { bank: string; account: string; name: string; }
interface CODRegion { id: string; region_name: string; region_name_ar: string; }

const STEPS = [
  { key: "info", label: "المعلومات", icon: User },
  { key: "address", label: "العنوان", icon: MapPin },
  { key: "payment", label: "الدفع", icon: CreditCard },
  { key: "review", label: "المراجعة", icon: Check },
] as const;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { country, customer, cart, getCartTotal, clearCart, currencyMode } = useStore();
  const isGuestLike = !customer || customer.id === "guest";
  const subtotal = getCartTotal();
  const currency = "ر.ي";

  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank">("cod");
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
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

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAddressOwnerKey(data.user?.id || customer?.id || "guest");
    });
    return () => { mounted = false; };
  }, [customer?.id]);

  useEffect(() => {
    const list = migrateLegacyCheckoutInfo(addressOwnerKey);
    setSavedAddresses(list);
    const def = list.find((a) => a.isDefault) || list[0];
    if (def) {
      setSelectedAddressId(def.id);
      setFormData((prev) => ({
        ...prev,
        name: isGuestLike ? String(def.name || prev.name || "") : prev.name,
        phone: isGuestLike ? String(def.phone || prev.phone || "") : prev.phone,
        city: def.city, address: def.address, notes: def.notes || "",
      }));
    }
  }, [addressOwnerKey, isGuestLike]);

  const getCostPriceTotal = () => cart.reduce((total, item) => {
    const costPrice = item.product.costPrice || item.product.price;
    const accessoriesTotal = item.selectedAccessories?.reduce((sum, acc) => sum + acc.price * acc.quantity, 0) || 0;
    return total + (costPrice + accessoriesTotal) * item.quantity;
  }, 0);

  const applyCoupon = async () => {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) { toast({ title: "خطأ", description: "أدخل كود الخصم", variant: "destructive" }); return; }
    const costPriceTotal = getCostPriceTotal();
    try {
      const { data: couponData } = await supabase.from("coupons").select("code, type, value").eq("is_active", true).limit(100);
      const match = couponData?.find((c) => c.code?.trim().toUpperCase() === normalized);
      if (match) {
        const coupon = match as { type: "percentage" | "fixed"; value: number };
        let discount = coupon.type === "percentage" ? (costPriceTotal * coupon.value) / 100 : coupon.value;
        discount = Math.min(discount, subtotal);
        setDiscountAmount(discount);
        setAppliedCoupon(normalized);
        toast({ title: "تم التطبيق", description: `خصم ${discount.toFixed(2)} ${currency}` });
        return;
      }
      setDiscountAmount(0);
      setAppliedCoupon(null);
      toast({ title: "غير صالح", description: "كود الخصم غير موجود", variant: "destructive" });
    } catch {
      setDiscountAmount(0);
      setAppliedCoupon(null);
      toast({ title: "خطأ", description: "فشل التحقق", variant: "destructive" });
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setDiscountAmount(0);
    setAppliedCoupon(null);
    toast({ title: "تمت إزالة الكوبون" });
  };

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["delivery-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_companies").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as DeliveryCompany[];
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["bank_accounts", "bank_accounts_ye", "bank_accounts_sa"]);
      let value: any = data?.find((r) => r.key === "bank_accounts")?.value ?? data?.find((r) => r.key === "bank_accounts_ye")?.value ?? data?.find((r) => r.key === "bank_accounts_sa")?.value;
      if (typeof value === "string") try { value = JSON.parse(value); } catch { return [] as BankAccount[]; }
      if (Array.isArray(value)) return value.map((v: any) => ({ bank: String(v?.bank || ""), account: String(v?.account || ""), name: String(v?.name || "") })) as BankAccount[];
      return [] as BankAccount[];
    },
  });

  const { data: whatsappNumber } = useQuery({
    queryKey: ["whatsapp-number"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["whatsapp", "whatsapp_ye", "whatsapp_sa"]);
      return (data?.find((r) => r.key === "whatsapp")?.value as string) || (data?.find((r) => r.key === "whatsapp_ye")?.value as string) || (data?.find((r) => r.key === "whatsapp_sa")?.value as string) || "967123456789";
    },
  });

  const { data: codRegions = [] } = useQuery({
    queryKey: ["cod-regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cod_regions").select("id, region_name, region_name_ar").eq("is_active", true).order("region_name_ar");
      if (error) throw error;
      return data as CODRegion[];
    },
  });

  const selectedCompany = deliveryCompanies.find((c) => c.id === selectedDelivery);
  const deliveryFee = selectedCompany?.base_fee || 0;
  const total = subtotal + deliveryFee - discountAmount;

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const insertOrder = async (payload: Record<string, unknown>) => {
        const { data, error } = await supabase.from("orders").insert(payload as any).select().single();
        if (error) throw error;
        return data;
      };
      const normalizeCountry = (payload: Record<string, unknown>) => payload.country === "GLOBAL" ? { ...payload, country: "YE" } : payload;
      try {
        return await insertOrder(normalizeCountry(orderData));
      } catch (error) {
        const message = String((error as { message?: string })?.message || "");
        if (/country/i.test(message) && /constraint|check/i.test(message)) {
          return await insertOrder({ ...orderData, country: "YE" });
        }
        if (!/column .* does not exist|Could not find the '.*' column|schema cache/i.test(message)) throw error;
        const legacy = { ...orderData };
        const notes = String(legacy.customer_notes || "").trim();
        const city = String(legacy.customer_city || "").trim();
        delete legacy.customer_city; delete legacy.coupon_code; delete legacy.discount_amount; delete legacy.currency_mode;
        legacy.customer_notes = [notes || null, city ? `المدينة: ${city}` : null].filter(Boolean).join(" | ") || null;
        return await insertOrder(legacy);
      }
    },
  });

  const validateStep = (step: number): boolean => {
    if (step === 0) {
      const name = String(customer?.name || formData.name || "").trim();
      const phone = String(customer?.phone || formData.phone || "").trim();
      if (isGuestLike && (!name || !phone)) {
        toast({ title: "الاسم ورقم الهاتف مطلوبان", variant: "destructive" });
        return false;
      }
    }
    if (step === 1) {
      if (!formData.city.trim() || !formData.address.trim()) {
        toast({ title: "المدينة والعنوان مطلوبان", variant: "destructive" });
        return false;
      }
    }
    if (step === 2) {
      if (!selectedDelivery) { toast({ title: "اختر شركة التوصيل", variant: "destructive" }); return false; }
      if (paymentMethod === "cod" && codRegions.length > 0 && !selectedRegion) {
        toast({ title: "اختر منطقة الاستلام", variant: "destructive" }); return false;
      }
    }
    return true;
  };

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const saveAddressToLocal = () => {
    upsertSavedAddress(addressOwnerKey, {
      id: selectedAddressId || `addr-${Date.now()}`,
      label: `عنوان ${savedAddresses.length + 1}`,
      name: formData.name.trim(), phone: formData.phone.trim(),
      city: formData.city.trim(), address: formData.address.trim(),
      notes: formData.notes.trim(), isDefault: true,
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;
    setIsSubmitting(true);
    const orderNumber = `ORD-${Date.now()}`;
    const rawOrderItems = cart.map((item) => {
      const basePrice = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price;
      const accessoriesTotal = item.selectedAccessories?.reduce((sum, acc) => sum + acc.price * acc.quantity, 0) || 0;
      return {
        product_id: item.product.id, product_name: item.product.nameAr,
        product_image: item.product.images?.[0] || "", quantity: item.quantity,
        price: basePrice + accessoriesTotal, selected_size: item.selectedSize || null,
        selected_accessories: (item.selectedAccessories || []).map((acc) => ({
          name: String((acc as any).name || ""), name_ar: String((acc as any).name_ar || (acc as any).name || ""),
          price: Number((acc as any).price) || 0, quantity: Number((acc as any).quantity) || 1,
          image_url: String((acc as any).image_url || ""),
        })),
      };
    });
    const validation = orderItemsSchema.safeParse(rawOrderItems);
    if (!validation.success) {
      toast({ title: "خطأ", description: "بيانات الطلب غير صحيحة", variant: "destructive" });
      setIsSubmitting(false); return;
    }
    try {
      const customerName = String(customer?.name || formData.name || "").trim();
      const customerPhone = String(customer?.phone || formData.phone || "").trim();
      saveAddressToLocal();

      const orderPayload: Record<string, unknown> = {
        order_number: orderNumber, customer_name: customerName || "عميل",
        customer_phone: customerPhone, customer_address: formData.address || "-",
        customer_city: formData.city || "", customer_notes: formData.notes || null,
        country: country || "GLOBAL",
        currency_code: currencyMode,
        exchange_rate_snapshot: (await import("@/lib/currency")).getRateSnapshot(currencyMode),
        total_base: total,
        items: validation.data, subtotal, delivery_fee: deliveryFee, total,
        delivery_company_id: selectedDelivery, payment_method: paymentMethod,
        coupon_code: discountAmount > 0 ? couponCode.trim().toUpperCase() : null,
        discount_amount: discountAmount,
      };
      if (customer?.id && customer.id !== "guest") orderPayload.customer_id = customer.id;

      await createOrderMutation.mutateAsync(orderPayload);
      const regionData = codRegions.find((r) => r.id === selectedRegion);
      const orderData = {
        orderNumber, customerName: customerName || "عميل", customerPhone,
        customerAddress: formData.address || "-", customerCity: formData.city || "",
        customerNotes: formData.notes || "", items: validation.data, subtotal, deliveryFee,
        discountAmount, couponCode: discountAmount > 0 ? couponCode.trim().toUpperCase() : null,
        total, paymentMethod, deliveryCompany: selectedCompany?.name || "",
        selectedRegion: paymentMethod === "cod" && regionData ? regionData.region_name_ar : null,
        country: country || "GLOBAL", currencyMode,
        whatsappNumber: whatsappNumber || "967123456789", createdAt: new Date().toISOString(),
      };
      clearCart();
      navigate("/order-confirmation", { state: { orderData } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "فشل إرسال الطلب";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) return (
    <div className="min-h-screen bg-background"><Navbar /><CartDrawer />
      <main className="pt-32 pb-16"><div className="container mx-auto px-4 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="font-heading text-2xl text-foreground mb-4">السلة فارغة</h1>
        <Button onClick={() => navigate("/products")} className="btn-gold">تسوق الآن</Button>
      </div></main><Footer /></div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar /><CartDrawer />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl md:text-4xl text-foreground mb-8 text-center">
            إتمام <span className="text-gold">الطلب</span>
          </motion.h1>

          {/* Stepper */}
          <div className="mb-10">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                        disabled={i > currentStep}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                          done ? "bg-gold text-white" : active ? "bg-gold text-white ring-4 ring-gold/20" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </button>
                      <span className={`text-xs mt-2 font-medium ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 -mt-6 transition-colors ${done ? "bg-gold" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step content */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                  className="bg-card border border-border rounded-2xl p-6">

                  {/* STEP 1: Info */}
                  {currentStep === 0 && (
                    <div className="space-y-5">
                      <h2 className="font-heading text-xl flex items-center gap-2"><User className="w-5 h-5 text-gold" /> معلوماتك الشخصية</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2">الاسم الكامل *</label>
                          <Input value={isGuestLike ? formData.name : (customer?.name || "")} onChange={(e) => isGuestLike && setFormData({ ...formData, name: e.target.value })} disabled={!isGuestLike} placeholder="أدخل اسمك" dir="rtl" />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">رقم الهاتف *</label>
                          <Input value={isGuestLike ? formData.phone : (customer?.phone || "")} onChange={(e) => isGuestLike && setFormData({ ...formData, phone: e.target.value })} disabled={!isGuestLike} placeholder="05xxxxxxxx" dir="ltr" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-2">البريد الإلكتروني (اختياري)</label>
                        <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" dir="ltr" />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Address */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <h2 className="font-heading text-xl flex items-center gap-2"><MapPin className="w-5 h-5 text-gold" /> عنوان التوصيل</h2>
                      {savedAddresses.length > 0 && (
                        <div>
                          <label className="block text-sm mb-2">اختر عنواناً محفوظاً</label>
                          <select value={selectedAddressId} onChange={(e) => {
                            const id = e.target.value; setSelectedAddressId(id);
                            const a = savedAddresses.find((x) => x.id === id);
                            if (a) setFormData((p) => ({ ...p, city: a.city, address: a.address, notes: a.notes || "" }));
                          }} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                            <option value="">— جديد —</option>
                            {savedAddresses.map((a) => <option key={a.id} value={a.id}>{a.label} - {a.city}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2">المدينة *</label>
                          <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="اختر مدينتك" dir="rtl" />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">العنوان بالتفصيل *</label>
                          <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="الحي، الشارع، رقم المبنى" dir="rtl" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-2">ملاحظات إضافية</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} dir="rtl"
                          placeholder="وقت التسليم المفضل، معلم قريب..." className="w-full px-4 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Payment */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <h2 className="font-heading text-xl flex items-center gap-2"><CreditCard className="w-5 h-5 text-gold" /> الشحن والدفع</h2>

                      <div>
                        <label className="block text-sm mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> شركة التوصيل *</label>
                        {deliveryCompanies.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {deliveryCompanies.map((c) => (
                              <button key={c.id} onClick={() => setSelectedDelivery(c.id)}
                                className={`p-4 border rounded-lg text-right transition-all ${selectedDelivery === c.id ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}>
                                <h3 className="font-heading">{c.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{c.base_fee} {currency} {c.delivery_days && `• ${c.delivery_days}`}</p>
                              </button>
                            ))}
                          </div>
                        ) : <p className="text-sm text-muted-foreground">لا توجد شركات توصيل</p>}
                      </div>

                      <div>
                        <label className="block text-sm mb-3">طريقة الدفع *</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <button type="button" onClick={() => setPaymentMethod("cod")}
                            className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${paymentMethod === "cod" ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}>
                            <Banknote className="w-6 h-6 text-gold" />
                            <div className="text-right"><h3 className="font-heading">الدفع عند الاستلام</h3><p className="text-xs text-muted-foreground">Cash on Delivery</p></div>
                          </button>
                          <button type="button" onClick={() => setPaymentMethod("bank")}
                            className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${paymentMethod === "bank" ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}>
                            <CreditCard className="w-6 h-6 text-gold" />
                            <div className="text-right"><h3 className="font-heading">تحويل بنكي</h3><p className="text-xs text-muted-foreground">Bank Transfer</p></div>
                          </button>
                        </div>
                      </div>

                      {paymentMethod === "cod" && codRegions.length > 0 && (
                        <div className="bg-muted rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> منطقة الاستلام *</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {codRegions.map((r) => (
                              <button key={r.id} type="button" onClick={() => setSelectedRegion(r.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedRegion === r.id ? "bg-gold text-white" : "bg-background border border-border hover:border-gold/50"}`}>
                                {r.region_name_ar}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {paymentMethod === "bank" && bankAccounts.length > 0 && (
                        <div className="bg-muted rounded-lg p-4 space-y-3">
                          <p className="text-sm text-muted-foreground">التحويل إلى:</p>
                          {bankAccounts.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-background rounded-md">
                              <div><p className="font-heading text-sm">{a.bank}</p><p className="text-xs font-mono text-muted-foreground" dir="ltr">{a.account}</p></div>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(a.account); toast({ title: "تم النسخ" }); }} className="p-2 text-gold hover:bg-gold/10 rounded-md"><Copy className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2"><Ticket className="w-4 h-4" /> كود الخصم (اختياري)</label>
                        {appliedCoupon ? (
                          <div className="flex items-center justify-between gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-700" />
                              <span className="text-sm font-medium text-emerald-800">{appliedCoupon}</span>
                              <span className="text-xs text-emerald-700">- {discountAmount.toFixed(2)} {currency}</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={removeCoupon} className="h-8 gap-1 text-destructive"><X className="w-3.5 h-3.5" /> إزالة</Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="أدخل الكود" />
                            <Button onClick={applyCoupon} variant="outline">تطبيق</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Review */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <h2 className="font-heading text-xl flex items-center gap-2"><Check className="w-5 h-5 text-gold" /> مراجعة الطلب</h2>

                      <div className="border border-border rounded-lg p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">معلوماتك</p>
                        <p className="text-sm"><strong>{formData.name || customer?.name}</strong> — <span dir="ltr">{formData.phone || customer?.phone}</span></p>
                      </div>

                      <div className="border border-border rounded-lg p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">عنوان التوصيل</p>
                        <p className="text-sm">{formData.city} — {formData.address}</p>
                        {formData.notes && <p className="text-xs text-muted-foreground">ملاحظات: {formData.notes}</p>}
                      </div>

                      <div className="border border-border rounded-lg p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">الشحن والدفع</p>
                        <p className="text-sm">{selectedCompany?.name} • {paymentMethod === "cod" ? "الدفع عند الاستلام" : "تحويل بنكي"}</p>
                        {appliedCoupon && (
                          <p className="text-sm text-emerald-700">كوبون: <strong>{appliedCoupon}</strong> — خصم {discountAmount.toFixed(2)} {currency}</p>
                        )}
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-3">المنتجات</p>
                        <div className="space-y-2">
                          {cart.map((item, i) => {
                            const price = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price;
                            const accTotal = item.selectedAccessories?.reduce((s, a) => s + a.price * a.quantity, 0) || 0;
                            return (
                              <div key={i} className="flex gap-3 items-center">
                                <img src={item.product.images?.[0] || "/placeholder.svg"} alt="" className="w-12 h-12 object-cover rounded border" />
                                <div className="flex-1 min-w-0"><p className="text-sm truncate">{item.product.nameAr}</p><p className="text-xs text-muted-foreground">{item.quantity} × {price.toFixed(0)}</p></div>
                                <span className="text-sm text-gold font-medium">{((price + accTotal) * item.quantity).toFixed(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center mt-6 gap-3">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 0} className="gap-2">
                  <ChevronRight className="w-4 h-4" /> السابق
                </Button>
                {currentStep < STEPS.length - 1 ? (
                  <Button onClick={nextStep} className="btn-gold gap-2">
                    التالي <ChevronLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="btn-gold gap-2">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    تأكيد الطلب النهائي
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar summary */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:sticky lg:top-24 lg:self-start">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <h2 className="font-heading text-lg">ملخص الطلب</h2>
                <div className="space-y-2 pb-3 border-b border-border max-h-64 overflow-y-auto">
                  {cart.map((item, i) => {
                    const price = item.product.discount ? item.product.price * (1 - item.product.discount / 100) : item.product.price;
                    const accTotal = item.selectedAccessories?.reduce((s, a) => s + a.price * a.quantity, 0) || 0;
                    return (
                      <div key={i} className="flex gap-2 items-start text-xs">
                        <img src={item.product.images?.[0] || "/placeholder.svg"} alt="" className="w-10 h-10 object-cover rounded border" />
                        <div className="flex-1 min-w-0"><p className="truncate">{item.product.nameAr}</p><p className="text-muted-foreground">{item.quantity}×</p></div>
                        <span className="text-gold font-medium">{((price + accTotal) * item.quantity).toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-sm"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} {currency}</span></div>
                <div className="flex justify-between text-sm"><span>رسوم التوصيل</span><span>{deliveryFee.toFixed(2)} {currency}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600"><span>خصم</span><span>-{discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>الإجمالي</span><span className="text-gold">{total.toFixed(2)} {currency}</span></div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
