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
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Banknote, Truck, Copy, MessageCircle, Loader2, MapPin, AlertCircle, Gift, X } from "lucide-react";

interface Beneficiary {
  id: string;
  name: string;
  code: string;
  commission_percentage: number;
  discount_percentage: number;
  is_active: boolean;
  is_approved: boolean;
}

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
  const { country, customer, cart, getCartTotal, clearCart } = useStore();
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank">("cod");
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    address: "",
    notes: "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBeneficiary, setActiveBeneficiary] = useState<Beneficiary | null>(null);
  const [beneficiaryDiscount, setBeneficiaryDiscount] = useState(0);

  const subtotal = getCartTotal();
  const currency = country === "SA" ? "ريال" : "ريال";

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

  // Check for beneficiary referral code
  useEffect(() => {
    const checkBeneficiaryCode = async () => {
      const refCode = localStorage.getItem('beneficiary_ref');
      if (!refCode) return;
      
      try {
        const { data, error } = await supabase
          .from("beneficiaries")
          .select("*")
          .eq("code", refCode.toUpperCase())
          .eq("is_active", true)
          .eq("is_approved", true)
          .maybeSingle();
        
        if (data && !error) {
          setActiveBeneficiary(data as Beneficiary);
          // Auto-apply beneficiary discount - ONLY on cost price
          const discount = (costPriceTotal * data.discount_percentage) / 100;
          setBeneficiaryDiscount(discount);
        }
      } catch (err) {
        console.error("Error checking beneficiary:", err);
      }
    };
    
    checkBeneficiaryCode();
  }, [costPriceTotal]);

  // Clear beneficiary
  const clearBeneficiary = () => {
    localStorage.removeItem('beneficiary_ref');
    setActiveBeneficiary(null);
    setBeneficiaryDiscount(0);
  };

  // Apply coupon - checks both coupons table and offers table
  const applyCoupon = async () => {
    const normalized = couponCode.trim().toUpperCase();
    const effectiveCountry = country || "SA";

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
        c.code?.trim().toUpperCase() === normalized &&
        (c.countries as string[])?.includes(effectiveCountry)
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
        .contains("countries", [effectiveCountry])
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
        .eq("country", country)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as DeliveryCompany[];
    },
    enabled: !!country,
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts", country],
    queryFn: async () => {
      const key = country === "SA" ? "bank_accounts_sa" : "bank_accounts_ye";
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      let value = data?.value;
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
    enabled: !!country,
  });

  // Fetch WhatsApp number
  const { data: whatsappNumber } = useQuery({
    queryKey: ["whatsapp-number", country],
    queryFn: async () => {
      const key = country === "SA" ? "whatsapp_sa" : "whatsapp_ye";
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      return (data?.value as string) || (country === "SA" ? "966123456789" : "967123456789");
    },
    enabled: !!country,
  });

  // Fetch COD regions
  const { data: codRegions = [] } = useQuery({
    queryKey: ["cod-regions", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cod_regions")
        .select("id, region_name, region_name_ar")
        .eq("country", country)
        .eq("is_active", true)
        .order("region_name_ar");
      if (error) throw error;
      return data as CODRegion[];
    },
    enabled: !!country,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase.from("orders").insert(orderData).select().single();
      if (error) throw error;
      return data;
    },
  });

  const selectedCompany = deliveryCompanies.find((c) => c.id === selectedDelivery);
  const deliveryFee = selectedCompany?.base_fee || 0;
  const totalDiscount = discountAmount + beneficiaryDiscount;
  const total = subtotal + deliveryFee - totalDiscount;

  const handleCopyAccount = (account: string) => {
    navigator.clipboard.writeText(account);
    toast({ title: "تم النسخ", description: "تم نسخ رقم الحساب" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    // For guest users, validate name and phone
    const isGuest = customer?.id === "guest";
    const customerName = isGuest ? formData.name : customer?.name;
    const customerPhone = isGuest ? formData.phone : customer?.phone;
    
    if (isGuest && (!formData.name.trim() || !formData.phone.trim())) {
      return toast({ title: "خطأ", description: "يرجى إدخال الاسم ورقم الهاتف", variant: "destructive" });
    }
    
    if (!formData.address || !selectedDelivery)
      return toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
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
      // Calculate beneficiary commission if applicable
      const beneficiaryCommission = activeBeneficiary 
        ? (subtotal * activeBeneficiary.commission_percentage) / 100 
        : 0;

      const orderPayload: Record<string, unknown> = {
        order_number: orderNumber,
        customer_name: customer?.name || formData.name || "عميل",
        customer_phone: customer?.phone || formData.phone || "",
        customer_address: formData.address,
        customer_notes: formData.notes || null,
        country: country || "SA",
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        delivery_company_id: selectedDelivery,
        payment_method: paymentMethod,
        coupon_code: discountAmount > 0 ? couponCode.trim().toUpperCase() : null,
        discount_amount: totalDiscount,
        beneficiary_id: activeBeneficiary?.id || null,
        beneficiary_code: activeBeneficiary?.code || null,
        beneficiary_commission: beneficiaryCommission,
      };
      
      // Only add customer_id if it's a valid registered customer (not guest)
      if (customer?.id && customer.id !== "guest") {
        orderPayload.customer_id = customer.id;
      }
      
      const createdOrder = await createOrderMutation.mutateAsync(orderPayload);
      
      // If there was a beneficiary, update the most recent visit to mark it as converted
      if (activeBeneficiary) {
        try {
          // Find the most recent unconverted visit for this beneficiary
          const { data: recentVisit } = await supabase
            .from("beneficiary_visits")
            .select("id")
            .eq("beneficiary_id", activeBeneficiary.id)
            .eq("converted_to_order", false)
            .order("visited_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (recentVisit) {
            await supabase
              .from("beneficiary_visits")
              .update({ 
                converted_to_order: true, 
                order_id: createdOrder.id 
              })
              .eq("id", recentVisit.id);
          }
        } catch (err) {
          console.error("Error updating visit:", err);
        }
        
        // Clear the beneficiary ref after successful order
        localStorage.removeItem('beneficiary_ref');
      }
      
      const selectedRegionData = codRegions.find((r) => r.id === selectedRegion);
      const orderData = {
        orderNumber,
        customerName: customer?.name || formData.name || "عميل",
        customerPhone: customer?.phone || formData.phone || "",
        customerAddress: formData.address,
        customerNotes: formData.notes,
        items: orderItems,
        subtotal,
        deliveryFee,
        discountAmount,
        couponCode: discountAmount > 0 ? couponCode.trim().toUpperCase() : null,
        total,
        paymentMethod,
        deliveryCompany: selectedCompany?.name || "",
        selectedRegion: paymentMethod === "cod" && selectedRegionData ? selectedRegionData.region_name_ar : null,
        country: country || "SA",
        whatsappNumber: whatsappNumber || (country === "SA" ? "966123456789" : "967123456789"),
        createdAt: new Date().toISOString(),
      };
      clearCart();
      navigate("/order-confirmation", { state: { orderData } });
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء إرسال الطلب", variant: "destructive" });
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
          
          {/* Beneficiary Discount Banner */}
          {activeBeneficiary && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-center gap-3 text-center">
                <Gift className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-green-700 text-lg">
                    🎉 لديك خصم {activeBeneficiary.discount_percentage}%!
                  </p>
                  <p className="text-sm text-green-600">
                    خصم حصري عبر رابط الإحالة من {activeBeneficiary.name} - مطبق تلقائياً
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Customer Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h2 className="font-heading text-xl text-foreground mb-6">معلومات التوصيل</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-body text-muted-foreground mb-2">الاسم الكامل *</label>
                    {customer?.id === "guest" ? (
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
                    {customer?.id === "guest" ? (
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-body text-muted-foreground mb-2">العنوان *</label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground/50"
                      rows={3}
                      dir="rtl"
                      placeholder="مثال: شارع الملك فهد، حي النزهة، مبنى رقم 15"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-body text-muted-foreground mb-2">ملاحظات (اختياري)</label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground/50"
                      rows={2}
                      dir="rtl"
                      placeholder="مثال: الرجاء التواصل قبل التوصيل"
                    />
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
              {/* Beneficiary Badge - Only shows when customer entered via referral link */}
              {activeBeneficiary && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">خصم حصري عبر رابط الإحالة</p>
                      <p className="text-xs text-muted-foreground">
                        خصم {activeBeneficiary.discount_percentage}% مطبق تلقائياً
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">خصم الإحالة ({activeBeneficiary.discount_percentage}%)</span>
                      <span className="text-primary font-medium">-{beneficiaryDiscount.toFixed(2)} {currency}</span>
                    </div>
                  </div>
                </div>
              )}

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
                {beneficiaryDiscount > 0 && (
                  <div className="flex justify-between text-primary font-medium text-sm">
                    <span>خصم الإحالة ({activeBeneficiary?.discount_percentage}%)</span>
                    <span>
                      -{beneficiaryDiscount.toFixed(2)} {currency}
                    </span>
                  </div>
                )}
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
