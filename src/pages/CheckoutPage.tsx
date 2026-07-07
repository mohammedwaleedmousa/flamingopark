import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { CreditCard, Banknote, Truck, Copy, MessageCircle, Loader2, MapPin, AlertCircle, X } from "lucide-react";
import {
  SavedAddress,
  migrateLegacyCheckoutInfo,
  upsertSavedAddress,
  getSavedAddresses,
} from "@/lib/savedAddresses";

// Zod schemas
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

interface Coupon {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  is_active: boolean;
}
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

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { country, customer, cart, getCartTotal, clearCart, currencyMode } = useStore();
  const isGuestLike = !customer || customer.id === "guest";
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank">("cod");
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    address: "",
    city: "",
    notes: "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressOwnerKey, setAddressOwnerKey] = useState("guest");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const subtotal = getCartTotal();
  const currency = "ر.ي";

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const owner = data.user?.id || customer?.id || "guest";
      setAddressOwnerKey(owner);
    });
    return () => {
      mounted = false;
    };
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
        city: def.city,
        address: def.address,
        notes: def.notes || "",
      }));
    }
  }, [addressOwnerKey, isGuestLike]);

  const saveCustomerInfo = () => {
    const now = Date.now();
    const currentLabel = selectedAddressId
      ? getSavedAddresses(addressOwnerKey).find((a) => a.id === selectedAddressId)?.label || `عنوان ${savedAddresses.length + 1}`
      : `عنوان ${savedAddresses.length + 1}`;

    const next = upsertSavedAddress(addressOwnerKey, {
      id: selectedAddressId || `addr-${now}`,
      label: currentLabel,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      notes: formData.notes.trim(),
      isDefault: true,
    });
    setSavedAddresses(next);
    const def = next.find((a) => a.isDefault) || next[0];
    setSelectedAddressId(def?.id || "");
    toast({ title: "تم الحفظ", description: "تم حفظ العنوان وربطه بحسابك" });
  };

  const useSavedCustomerInfo = () => {
    const chosen = savedAddresses.find((a) => a.id === selectedAddressId);
    if (!chosen) {
      return toast({ title: "تنبيه", description: "اختر عنوانًا محفوظًا أولاً", variant: "destructive" });
    }
    setFormData((prev) => ({
      ...prev,
      name: isGuestLike ? String(chosen.name || prev.name || "") : prev.name,
      phone: isGuestLike ? String(chosen.phone || prev.phone || "") : prev.phone,
      city: chosen.city,
      address: chosen.address,
      notes: chosen.notes || "",
    }));
    toast({ title: "تم", description: "تم تعبئة العنوان المحفوظ" });
  };

  const startNewAddress = () => {
    setSelectedAddressId("");
    setFormData((prev) => ({ ...prev, address: "", city: "", notes: "" }));
    toast({ title: "عنوان جديد", description: "يمكنك الآن إدخال عنوان مختلف" });
  };

  // Calculate total cost price (for discount calculations)
  const getCostPriceTotal = () => {
    return cart.reduce((total, item) => {
      // Use costPrice if available, otherwise use price
      const costPrice = item.product.costPrice || item.product.price;
      // Note: Accessories don't have cost price, so we use their full price
      const accessoriesTotal = item.selectedAccessories
        ? item.selectedAccessories.reduce((sum, acc) => sum + acc.price * acc.quantity, 0)
        : 0;
      return total + (costPrice + accessoriesTotal) * item.quantity;
    }, 0);
  };

  const costPriceTotal = getCostPriceTotal();

  // Apply coupon - checks both coupons table and offers table
  const applyCoupon = async () => {
    const normalized = couponCode.trim().toUpperCase();

    if (!normalized) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال كود الخصم",
        variant: "destructive",
      });
      return;
    }

    try {
      // First check coupons table - trim spaces from code for comparison
      const { data: couponData } = await supabase
        .from("coupons")
        .select("code, type, value, countries")
        .eq("is_active", true)
        .limit(100);
        
      // Find matching coupon manually (handles trimming issues)
      const matchingCoupon = couponData?.find(c => 
        c.code?.trim().toUpperCase() === normalized
      );

      if (matchingCoupon) {
        const coupon = matchingCoupon as { type: "percentage" | "fixed"; value: number };
        let discount = 0;
        if (coupon.type === "percentage") {
          // Apply percentage discount ONLY on cost price
          discount = (costPriceTotal * coupon.value) / 100;
        } else {
          discount = coupon.value;
        }
        // Don't let discount exceed the subtotal
        discount = Math.min(discount, subtotal);
        setDiscountAmount(discount);
        toast({
          title: "تم التطبيق",
          description: `تم تطبيق خصم ${discount.toFixed(2)} ${currency}`,
        });
        return;
      }

      // Then check offers table for discount_code
      const { data: offerData } = await supabase
        .from("offers")
        .select("discount_percentage, product_ids")
        .eq("discount_code", normalized)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (offerData && offerData.discount_percentage > 0) {
        // Check if offer has specific products
        const offerProductIds = offerData.product_ids as string[] | null;
        
        // Calculate applicable cost price total for offer products
        let applicableCostPriceTotal = costPriceTotal;
        
        if (offerProductIds && offerProductIds.length > 0) {
          // Only apply discount to cost price of products in the offer
          applicableCostPriceTotal = cart.reduce((sum, item) => {
            if (offerProductIds.includes(item.product.id)) {
              // Use costPrice if available, otherwise use price
              const costPrice = item.product.costPrice || item.product.price;
              const accessoriesTotal = item.selectedAccessories
                ? item.selectedAccessories.reduce((accSum, acc) => accSum + acc.price * acc.quantity, 0)
                : 0;
              return sum + (costPrice + accessoriesTotal) * item.quantity;
            }
            return sum;
          }, 0);
          
          if (applicableCostPriceTotal === 0) {
            setDiscountAmount(0);
            toast({
              title: "غير قابل للتطبيق",
              description: "هذا الكوبون صالح لمنتجات معينة غير موجودة في سلتك",
              variant: "destructive",
            });
            return;
          }
        }
        
        // Apply discount on cost price only
        const discount = Math.min((applicableCostPriceTotal * offerData.discount_percentage) / 100, subtotal);
        setDiscountAmount(discount);
        toast({
          title: "تم التطبيق",
          description: `تم تطبيق خصم ${discount.toFixed(2)} ${currency}`,
        });
        return;
      }

      // No valid coupon found
      setDiscountAmount(0);
      toast({
        title: "غير صالح",
        description: "كود الخصم غير موجود أو غير صالح",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Coupon check error:", error);
      setDiscountAmount(0);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحقق من الكوبون",
        variant: "destructive",
      });
    }
  };

  // Fetch delivery companies
  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["delivery-companies", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_companies")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as DeliveryCompany[];
    },
    enabled: true,
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["bank_accounts", "bank_accounts_ye", "bank_accounts_sa"]);
      if (error) throw error;
      const primary = data?.find((row) => row.key === "bank_accounts")?.value;
      const legacyYe = data?.find((row) => row.key === "bank_accounts_ye")?.value;
      const legacySa = data?.find((row) => row.key === "bank_accounts_sa")?.value;
      let value = primary ?? legacyYe ?? legacySa;
      if (typeof value === "string")
        try {
          value = JSON.parse(value);
        } catch {
          return [] as BankAccount[];
        }
      if (Array.isArray(value))
        return value.map((v) => ({
          bank: String((v as any)?.bank || ""),
          account: String((v as any)?.account || ""),
          name: String((v as any)?.name || ""),
        })) as BankAccount[];
      return [] as BankAccount[];
    },
    enabled: true,
  });

  // Fetch WhatsApp number
  const { data: whatsappNumber } = useQuery({
    queryKey: ["whatsapp-number", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["whatsapp", "whatsapp_ye", "whatsapp_sa"]);
      if (error) throw error;
      const unified = data?.find((row) => row.key === "whatsapp")?.value;
      const legacyYe = data?.find((row) => row.key === "whatsapp_ye")?.value;
      const legacySa = data?.find((row) => row.key === "whatsapp_sa")?.value;
      return (unified as string) || (legacyYe as string) || (legacySa as string) || "967123456789";
    },
    enabled: true,
  });

  // Fetch COD regions
  const { data: codRegions = [] } = useQuery({
    queryKey: ["cod-regions", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cod_regions")
        .select("id, region_name, region_name_ar")
        .eq("is_active", true)
        .order("region_name_ar");
      if (error) throw error;
      return data as CODRegion[];
    },
    enabled: true,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const insertOrder = async (payload: Record<string, unknown>) => {
        const { data, error } = await supabase.from("orders").insert(payload).select().single();
        if (error) throw error;
        return data;
      };

      const normalizeCountryForLegacy = (payload: Record<string, unknown>) => {
        if (payload.country === "GLOBAL") {
          return { ...payload, country: "YE" };
        }
        return payload;
      };

      try {
        return await insertOrder(normalizeCountryForLegacy(orderData as Record<string, unknown>));
      } catch (error) {
        const message = String((error as { message?: string })?.message || "");
        const hasMissingColumnError =
          /column .* does not exist/i.test(message) ||
          /Could not find the '.*' column/i.test(message) ||
          /schema cache/i.test(message);
        const hasCountryConstraintError =
          /country/i.test(message) && /constraint|check/i.test(message);

        if (hasCountryConstraintError) {
          const retryPayload = { ...(orderData as Record<string, unknown>), country: "YE" };
          return await insertOrder(retryPayload);
        }

        if (!hasMissingColumnError) {
          throw error;
        }

        const legacyPayload = { ...(orderData as Record<string, unknown>) };
        const notesValue = String(legacyPayload.customer_notes || "").trim();
        const cityValue = String(legacyPayload.customer_city || "").trim();

        delete legacyPayload.customer_city;
        delete legacyPayload.coupon_code;
        delete legacyPayload.discount_amount;
        delete legacyPayload.currency_mode;

        legacyPayload.customer_notes = [
          notesValue || null,
          cityValue ? `المدينة: ${cityValue}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || null;

        return await insertOrder(legacyPayload);
      }
    },
  });

  const selectedCompany = deliveryCompanies.find((c) => c.id === selectedDelivery);
  const deliveryFee = selectedCompany?.base_fee || 0;
  const totalDiscount = discountAmount;
  const total = subtotal + deliveryFee - totalDiscount;

  const handleCopyAccount = (account: string) => {
    navigator.clipboard.writeText(account);
    toast({ title: "تم النسخ", description: "تم نسخ رقم الحساب" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    // Treat missing customer profile as guest-like to avoid empty order identity fields.
    const customerName = String(customer?.name || formData.name || "").trim();
    const customerPhone = String(customer?.phone || formData.phone || "").trim();

    if (isGuestLike && (!customerName || !customerPhone)) {
      return toast({ title: "خطأ", description: "يرجى إدخال الاسم ورقم الهاتف", variant: "destructive" });
    }

    if (!formData.city.trim() || !formData.address.trim()) {
      return toast({ title: "خطأ", description: "يرجى إدخال المدينة والعنوان", variant: "destructive" });
    }
    
    if (!selectedDelivery)
      return toast({ title: "خطأ", description: "يرجى اختيار شركة التوصيل", variant: "destructive" });
    if (paymentMethod === "cod" && codRegions.length > 0 && !selectedRegion)
      return toast({ title: "خطأ", description: "يرجى اختيار منطقة الاستلام", variant: "destructive" });
    
    setIsSubmitting(true);

    const orderNumber = `ORD-${Date.now()}`;
    const rawOrderItems = cart.map((item) => {
      const basePrice = item.product.discount
        ? item.product.price * (1 - item.product.discount / 100)
        : item.product.price;
      const accessoriesTotal = item.selectedAccessories
        ? item.selectedAccessories.reduce((sum, acc) => sum + acc.price * acc.quantity, 0)
        : 0;
      return {
        product_id: item.product.id,
        product_name: item.product.nameAr,
        product_image: item.product.images?.[0] || "",
        quantity: item.quantity,
        price: basePrice + accessoriesTotal,
        selected_size: item.selectedSize || null,
        selected_accessories: (item.selectedAccessories || []).map((acc) => ({
          name: String((acc as any).name || ""),
          name_ar: String((acc as any).name_ar || (acc as any).name || ""),
          price: Number((acc as any).price) || 0,
          quantity: Number((acc as any).quantity) || 1,
          image_url: String((acc as any).image_url || ""),
        })),
      };
    });
    const validationResult = orderItemsSchema.safeParse(rawOrderItems);
    if (!validationResult.success)
      return toast({
        title: "خطأ",
        description: "حدث خطأ في بيانات الطلب. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    const orderItems = validationResult.data;

    try {
      const orderPayload: Record<string, unknown> = {
        order_number: orderNumber,
        customer_name: customerName || "عميل",
        customer_phone: customerPhone,
        customer_address: formData.address || "-",
        customer_city: formData.city || "",
        customer_notes: formData.notes || null,
        country: country === "GLOBAL" ? "YE" : country || "YE",
        currency_mode: currencyMode,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        delivery_company_id: selectedDelivery,
        payment_method: paymentMethod,
        coupon_code: discountAmount > 0 ? couponCode.trim().toUpperCase() : null,
        discount_amount: totalDiscount,
      };
      
      // Only add customer_id if it's a valid registered customer (not guest)
      if (customer?.id && customer.id !== "guest") {
        orderPayload.customer_id = customer.id;
      }
      
      await createOrderMutation.mutateAsync(orderPayload);
      
      const selectedRegionData = codRegions.find((r) => r.id === selectedRegion);
      
      const correctWhatsappNumber = whatsappNumber || "967123456789";
      
      const orderData = {
        orderNumber,
        customerName: customer?.name || formData.name || "عميل",
        customerPhone: customer?.phone || formData.phone || "",
        customerAddress: formData.address || "-",
        customerCity: formData.city || "",
        customerNotes: formData.notes || "",
        items: orderItems,
        subtotal,
        deliveryFee,
        discountAmount,
        couponCode: discountAmount > 0 ? couponCode.trim().toUpperCase() : null,
        total,
        paymentMethod,
        deliveryCompany: selectedCompany?.name || "",
        selectedRegion: paymentMethod === "cod" && selectedRegionData ? selectedRegionData.region_name_ar : null,
        country: country === "GLOBAL" ? "YE" : country || "YE",
        currencyMode,
        whatsappNumber: correctWhatsappNumber,
        createdAt: new Date().toISOString(),
      };
      clearCart();
      navigate("/order-confirmation", { state: { orderData } });
    } catch (error) {
      console.error("Order submission error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : String((error as { message?: string; details?: string })?.message || (error as { details?: string })?.details || "حدث خطأ أثناء إرسال الطلب");
      toast({ title: "خطأ", description: errorMessage, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <CartDrawer />
        <main className="pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-2xl text-foreground mb-4">السلة فارغة</h1>
            <Button onClick={() => navigate("/products")} className="btn-gold">
              تسوق الآن
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl md:text-4xl text-foreground mb-8 text-center"
          >
            إتمام <span className="text-gold">الطلب</span>
          </motion.h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h2 className="font-heading text-xl text-foreground mb-6">معلومات التوصيل</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-body text-muted-foreground mb-2">الاسم الكامل *</label>
                      {isGuestLike ? (
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground/50"
                          dir="rtl"
                          placeholder="أدخل اسمك الكامل"
                        />
                      ) : (
                        <Input
                          value={customer?.name || ""}
                          disabled
                          className="bg-muted/50 border-border text-foreground"
                          dir="rtl"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-body text-muted-foreground mb-2">رقم الهاتف *</label>
                      {isGuestLike ? (
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground/50"
                          dir="ltr"
                          placeholder="05xxxxxxxx"
                        />
                      ) : (
                        <Input
                          value={customer?.phone || ""}
                          disabled
                          className="bg-muted/50 border-border text-foreground"
                          dir="ltr"
                        />
                      )}
                    </div>
                  </div>

                  {/* Address Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-body text-muted-foreground mb-2">المحافظة/المدينة *</label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground/50"
                        dir="rtl"
                        placeholder="اختر مدينتك"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-body text-muted-foreground mb-2">العنوان بالتفصيل *</label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground/50"
                        dir="rtl"
                        placeholder="الحي، الشارع، رقم المبنى..."
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-body text-muted-foreground mb-2">ملاحظات إضافية</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                      dir="rtl"
                      placeholder="أضف أي ملاحظات خاصة للطلب (مثل وقت التسليم المفضل)"
                      rows={3}
                    />
                  </div>

                  {savedAddresses.length > 0 && (
                    <div>
                      <label className="block text-sm font-body text-muted-foreground mb-2">العناوين المحفوظة</label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">اختر عنوانًا محفوظًا</option>
                        {savedAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.label} - {addr.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={saveCustomerInfo}>
                      حفظ المعلومات
                    </Button>
                    {savedAddresses.length > 0 && (
                      <Button type="button" variant="outline" onClick={useSavedCustomerInfo}>
                        استخدام المحفوظ
                      </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={startNewAddress}>
                      عنوان جديد
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Delivery */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h2 className="font-heading text-xl text-foreground mb-6 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-gold" />
                  شركة التوصيل
                </h2>
                {deliveryCompanies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deliveryCompanies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => setSelectedDelivery(company.id)}
                        className={`p-4 border rounded-lg text-right transition-all ${selectedDelivery === company.id ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}
                      >
                        <h3 className="font-heading text-foreground">{company.name}</h3>
                        <p className="text-sm text-muted-foreground font-body mt-1">
                          {company.base_fee} {currency} {company.delivery_days && `• ${company.delivery_days}`}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">لا توجد شركات توصيل متاحة</p>
                )}
              </motion.div>

              {/* Payment */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h2 className="font-heading text-xl text-foreground mb-6">طريقة الدفع</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${paymentMethod === "cod" ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}
                  >
                    <Banknote className="w-6 h-6 text-gold" />
                    <div className="text-right">
                      <h3 className="font-heading text-foreground">الدفع عند الاستلام</h3>
                      <p className="text-xs text-muted-foreground font-body">Cash on Delivery</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank")}
                    className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${paymentMethod === "bank" ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}
                  >
                    <CreditCard className="w-6 h-6 text-gold" />
                    <div className="text-right">
                      <h3 className="font-heading text-foreground">تحويل بنكي</h3>
                      <p className="text-xs text-muted-foreground font-body">Bank Transfer</p>
                    </div>
                  </button>
                </div>

                {/* COD regions */}
                {paymentMethod === "cod" && (
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MapPin className="w-4 h-4 text-gold" />
                      <span>اختر منطقة الاستلام *</span>
                    </div>
                    {codRegions.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {codRegions.map((region) => (
                          <button
                            key={region.id}
                            type="button"
                            onClick={() => setSelectedRegion(region.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedRegion === region.id ? "bg-gold text-white border-gold" : "bg-background border border-border text-foreground hover:border-gold/50"}`}
                          >
                            {region.region_name_ar}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">لا توجد مناطق محددة حالياً للدفع عند الاستلام</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bank accounts */}
                {paymentMethod === "bank" && bankAccounts.length > 0 && (
                  <div className="bg-muted rounded-lg p-4 space-y-4">
                    <p className="text-sm text-muted-foreground font-body">يرجى التحويل إلى أحد الحسابات التالية:</p>
                    {bankAccounts.map((acc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background rounded-md">
                        <div>
                          <p className="font-heading text-sm text-foreground">{acc.bank}</p>
                          <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                            {acc.account}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(acc.account)}
                          className="p-2 text-gold hover:bg-gold/10 rounded-md transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Beneficiary + Coupon + Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              {/* Coupon */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-heading text-lg text-foreground mb-4">كود الخصم</h2>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="أدخل كود الخصم"
                  />
                  <Button onClick={applyCoupon} className="flex-shrink-0">
                    تطبيق
                  </Button>
                </div>
                {discountAmount > 0 && (
                  <p className="mt-3 text-green-600 font-medium">
                    تم تطبيق خصم: {discountAmount.toFixed(2)} {currency}
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="font-heading text-lg text-foreground mb-4">ملخص الطلب</h2>
                
                {/* Cart Items with Images */}
                <div className="space-y-3 pb-4 border-b border-border">
                  {cart.map((item, index) => {
                    const itemPrice = item.product.discount
                      ? item.product.price * (1 - item.product.discount / 100)
                      : item.product.price;
                    const accessoriesTotal = item.selectedAccessories
                      ? item.selectedAccessories.reduce((sum, acc) => sum + acc.price * acc.quantity, 0)
                      : 0;
                    return (
                      <div key={index} className="flex gap-3 items-start">
                        <img 
                          src={item.product.images?.[0] || '/placeholder.svg'} 
                          alt={item.product.nameAr}
                          className="w-14 h-14 object-cover rounded-lg border border-border flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.nameAr}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {itemPrice.toFixed(0)} {currency}
                          </p>
                          {item.selectedSize && (
                            <span className="text-xs text-blue-600">الحجم: {item.selectedSize}</span>
                          )}
                          {item.selectedAccessories && item.selectedAccessories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.selectedAccessories.map((acc, i) => (
                                <span key={i} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                  {acc.name_ar} +{acc.price * acc.quantity}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gold">
                          {((itemPrice + accessoriesTotal) * item.quantity).toFixed(0)} {currency}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>المجموع الفرعي</span>
                  <span>
                    {subtotal.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>رسوم التوصيل</span>
                  <span>
                    {deliveryFee.toFixed(2)} {currency}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium text-sm">
                    <span>خصم الكوبون</span>
                    <span>
                      -{discountAmount.toFixed(2)} {currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-lg pt-2 border-t border-border">
                  <span>الإجمالي</span>
                  <span>
                    {total.toFixed(2)} {currency}
                  </span>
                </div>
                <Button onClick={handleSubmit} className="w-full mt-4 bg-gold hover:bg-gold/90">
                  إتمام الطلب
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
