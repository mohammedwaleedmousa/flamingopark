import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { User, Heart, ShoppingBag, LogOut, Package, Mail, ChevronLeft, Settings, Truck, Upload, Check, X, AlertCircle, Camera, Receipt } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuthActions } from "@/hooks/useAuthActions";
import {
  SavedAddress,
  getSavedAddresses,
  upsertSavedAddress,
  removeSavedAddress,
  migrateLegacyCheckoutInfo,
} from "@/lib/savedAddresses";

const AccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [region, setRegion] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressForm, setAddressForm] = useState({ label: "", city: "", address: "", notes: "" });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [invoices, setInvoices] = useState<Array<{ id: string; order_number: string; total: number; status: string; created_at: string; invoice_url: string | null }>>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { favorites, syncWithDatabase } = useFavorites();
  const { logout } = useAuthActions();
  const latestOrderNumber = invoices[0]?.order_number || "";

  useEffect(() => {
  const loadCustomer = async () => {
    const savedCustomer = localStorage.getItem("customer");

    if (!savedCustomer) {
      navigate("/auth", { replace: true });
      return;
    }

    try {
      const customerData = JSON.parse(savedCustomer);

      setCustomer(customerData);

      setUser({
        id: customerData.id,
        user_metadata: {
          full_name: customerData.name,
          phone_number: customerData.phone,
          region: customerData.region,
        },
        created_at: customerData.created_at || new Date().toISOString(),
      });

      // جلب البيانات الجديدة من Supabase
      if (customerData.phone) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", customerData.phone)
          .single();

        if (!error && data) {
          setCustomer(data);

          localStorage.setItem(
            "customer",
            JSON.stringify(data)
          );
        } else {
          console.log("Customer fetch error:", error);
        }
      }

    } catch (error) {
      console.error(error);
      localStorage.removeItem("customer");
      navigate("/auth");
    }

    setLoading(false);
  };

  loadCustomer();

}, [navigate]);

  const fetchCustomer = async () => {
    const phone =
      localStorage.getItem("customer_phone") ||
      user?.user_metadata?.phone_number;
    if (!phone) return;
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .single();
    if (!error && data) {
      setCustomer(data);
    }
  };

  // Initialize form fields when user data loads or edit mode is enabled
  useEffect(() => {
    if (customer) {
      setFullName(customer.name || "");
      setPhoneNumber(customer.phone || "");
      setRegion(customer.region || "");
    }
  }, [customer]);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const syncAddresses = async () => {
      const { data: existing, error } = await (supabase as any)
        .from("customer_addresses").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (error) {
        if (active) setSavedAddresses(migrateLegacyCheckoutInfo(user.id));
        return;
      }
      const migrationKey = `flamingopark-addresses-db-synced:${user.id}`;
      let rows = existing || [];
      if (!localStorage.getItem(migrationKey) && rows.length === 0) {
        const legacy = migrateLegacyCheckoutInfo(user.id);
        if (legacy.length) {
          const { data: inserted, error: insertError } = await (supabase as any).from("customer_addresses").insert(
            legacy.map((a) => ({ id: a.id, user_id: user.id, label: a.label, recipient_name: a.name || "", phone: a.phone || "", city: a.city, address_line1: a.address, notes: a.notes || null, is_default: !!a.isDefault })),
          ).select();
          if (!insertError) {
            rows = inserted || [];
            localStorage.setItem(migrationKey, "1");
          }
        } else {
          localStorage.setItem(migrationKey, "1");
        }
      }
      if (active) setSavedAddresses(rows.map((a: any) => ({ id: a.id, label: a.label, name: a.recipient_name, phone: a.phone, city: a.city, address: a.address_line1, notes: a.notes || "", isDefault: a.is_default, updatedAt: a.updated_at })));
    };
    void syncAddresses();
    void syncWithDatabase(user.id);
    return () => { active = false; };
  }, [user?.id, syncWithDatabase]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.id) return;
      setInvoicesLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, order_number, total, status, created_at, invoice_url")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        setInvoices(data || []);
      } catch {
        setInvoices([]);
      } finally {
        setInvoicesLoading(false);
      }
    };
    fetchInvoices();
    const intervalId = window.setInterval(fetchInvoices, 15000);
    const onFocus = () => {
      fetchInvoices();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchInvoices();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [customer?.id, customer?.phone]);

  useEffect(() => {
    if (location.hash !== "#orders") return;
    const el = document.getElementById("account-orders");
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [location.hash, invoices.length]);

  const resetAddressForm = () => {
    setAddressForm({ label: "", city: "", address: "", notes: "" });
    setEditingAddressId(null);
  };

  const saveAddress = async () => {
    if (!user?.id) return;
    if (!addressForm.city.trim() || !addressForm.address.trim()) {
      setNotification({ type: "error", message: "المدينة والعنوان مطلوبان" }); return;
    }
    const id = editingAddressId || crypto.randomUUID();
    const isDefault = savedAddresses.length === 0 || savedAddresses.find((a) => a.id === id)?.isDefault === true;
    if (isDefault) await (supabase as any).from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
    const { data, error } = await (supabase as any).from("customer_addresses").upsert({
      id, user_id: user.id, label: addressForm.label.trim() || `عنوان ${savedAddresses.length + 1}`,
      recipient_name: String(user.user_metadata?.full_name || ""), phone: String(user.user_metadata?.phone_number || ""),
      city: addressForm.city.trim(), address_line1: addressForm.address.trim(), notes: addressForm.notes.trim() || null, is_default: isDefault,
    }).select().single();
    if (error) { setNotification({ type: "error", message: "فشل حفظ العنوان" }); return; }
    const next = upsertSavedAddress(user.id, { id: data.id, label: data.label, name: data.recipient_name, phone: data.phone, city: data.city, address: data.address_line1, notes: data.notes || "", isDefault: data.is_default });
    setSavedAddresses(next); resetAddressForm(); setNotification({ type: "success", message: "تم حفظ العنوان" });
  };

  const editAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label || "",
      city: addr.city || "",
      address: addr.address || "",
      notes: addr.notes || "",
    });
  };

  const deleteAddress = async (id: string) => {
    if (!user?.id) return;
    const { error } = await (supabase as any).from("customer_addresses").delete().eq("id", id).eq("user_id", user.id);
    if (error) { setNotification({ type: "error", message: "فشل حذف العنوان" }); return; }
    const next = removeSavedAddress(user.id, id); setSavedAddresses(next);
    if (editingAddressId === id) resetAddressForm();
  };

  const setDefaultAddress = async (addr: SavedAddress) => {
    if (!user?.id) return;
    await (supabase as any).from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await (supabase as any).from("customer_addresses").update({ is_default: true }).eq("id", addr.id).eq("user_id", user.id);
    if (error) { setNotification({ type: "error", message: "فشل تعيين العنوان الافتراضي" }); return; }
    const next = upsertSavedAddress(user.id, { ...addr, isDefault: true }); setSavedAddresses(next);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      setNotification({ type: "error", message: "الاسم الكامل مطلوب" });
      return;
    }

    setFormLoading(true);
    try {
      let avatarUrl = String(user?.user_metadata?.avatar_url || "");
      if (avatar) {
        const safeName = avatar.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `avatars/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(path, avatar, { upsert: true, cacheControl: "3600" });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(path);
          avatarUrl = publicData.publicUrl;
        } else {
          setNotification({ type: "error", message: "فشل رفع الصورة: " + uploadError.message });
        }
      } else if (avatarPreview && !avatarPreview.startsWith("data:")) {
        avatarUrl = avatarPreview;
      }

      const { error } = await (supabase as any)
      .from("customers")
      .update({
        name: fullName.trim(),
        phone: phoneNumber.trim(),
        region: region.trim(),
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer.id);

      if (error) {
        setNotification({ type: "error", message: "فشل تحديث البيانات: " + error.message });
      } else {
        setNotification({ type: "success", message: "تم تحديث بياناتك بنجاح" });
        
        // Update local user state
        const updatedCustomer = {
          ...customer,
          name: fullName.trim(),
          phone: phoneNumber.trim(),
          region: region.trim(),
          avatar_url: avatarUrl || customer.avatar_url || null,
        };

        setCustomer(updatedCustomer);

        localStorage.setItem(
          "customer",
          JSON.stringify(updatedCustomer)
        );
        
        // Close form after 1.5 seconds
        setTimeout(() => {
          setEditMode(false);
          setAvatar(null);
        }, 1500);
      }
    } catch (error: any) {
      setNotification({ type: "error", message: "حدث خطأ أثناء التحديث" });
      console.error("Error updating profile:", error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setAvatar(null);
    setAvatarPreview("");
    setNotification(null);
  };

  const handleLogout = async () => {
    localStorage.removeItem("customer");
    localStorage.removeItem("customer_phone");
    await logout({ redirectTo: "/home" });
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setEditMode(true);
  };

  if (loading) return <LoadingScreen />;

  const mainItems = [
    { to: "/favorites", icon: Heart, label: "المفضلة", desc: `${favorites.length} منتج`, color: "text-primary" },
    { to: "/cart", icon: ShoppingBag, label: "حقيبتي", desc: "عرض السلة الحالية", color: "text-blue-500" },
    { to: "/my-orders", icon: Package, label: "طلباتي", desc: "سجل الطلبات والفواتير", color: "text-green-500" },
  ];

  const openInvoice = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("invoice-access", { body: { action: "signed_url", orderId } });
      if (error || !data?.signedUrl) throw error || new Error("Invoice unavailable");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      setNotification({ type: "error", message: "تعذر فتح الفاتورة" });
    }
  };

  const settingsItems = [
    { to: "/account", icon: Settings, label: "الإعدادات", desc: "تحديث بياناتك الشخصية", color: "text-amber-500" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const invoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const shippingStatusMap: Record<string, string> = {
    pending: "بانتظار التأكيد",
    confirmed: "تم التأكيد",
    processing: "قيد التجهيز",
    shipped: "قيد الشحن",
    out_for_delivery: "خرج للتسليم",
    delivered: "تم التسليم",
    cancelled: "ملغي",
    canceled: "ملغي",
  };
  const shippingProgressMap: Record<string, number> = {
    pending: 20,
    confirmed: 35,
    processing: 55,
    shipped: 80,
    out_for_delivery: 90,
    delivered: 100,
    cancelled: 0,
    canceled: 0,
  };
  const shippingToneMap: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-indigo-100 text-indigo-700",
    shipped: "bg-sky-100 text-sky-700",
    out_for_delivery: "bg-cyan-100 text-cyan-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    canceled: "bg-red-100 text-red-700",
  };
  const shippingProgressBarMap: Record<string, string> = {
    pending: "bg-amber-500",
    confirmed: "bg-blue-500",
    processing: "bg-indigo-500",
    shipped: "bg-sky-500",
    out_for_delivery: "bg-cyan-500",
    delivered: "bg-emerald-500",
    cancelled: "bg-red-500",
    canceled: "bg-red-500",
  };
  const activeShipments = invoices.filter((inv) => {
    const status = String(inv.status || "").toLowerCase();
    return !["delivered", "cancelled", "canceled"].includes(status);
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {/* Profile Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mb-12 overflow-hidden"
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-3xl blur-2xl" />
            
            <div className="relative text-center py-8 md:py-12 px-6 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-3xl">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/70 text-background rounded-full flex items-center justify-center mb-4 shadow-lg shadow-primary/30"
              >
                {customer?.avatar_url ? (
                  <img
                    src={customer.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="w-10 h-10" />
                )}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="font-heading text-3xl md:text-4xl">
                  {customer?.name || "أهلاً بك"}
                </h1>

                <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2 flex-wrap">
                  <Mail className="w-4 h-4" />
                  {customer?.phone}
                </p>

                <p className="text-sm text-muted-foreground mt-2">
                  📍 {customer?.region}
                </p>

                <p className="text-xs text-muted-foreground mt-3">
                  عضو منذ {new Date(user?.created_at).toLocaleDateString('ar-EG')}
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Invoices */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
            id="account-orders"
          >
            <h2 className="font-heading text-lg px-2 text-muted-foreground">سجل فواتيري</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="text-xs text-muted-foreground">عدد الفواتير</p>
                <p className="text-2xl font-heading mt-1">{invoices.length}</p>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="text-xs text-muted-foreground">الإجمالي</p>
                <p className="text-2xl font-heading mt-1">{invoiceTotal.toLocaleString("ar-EG")}</p>
              </div>
            </div>

            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="p-4 border-b border-border/60 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <p className="text-sm font-heading">آخر الفواتير</p>
              </div>

              <div className="divide-y divide-border/60">
                {invoicesLoading && <p className="p-4 text-sm text-muted-foreground">جاري تحميل الفواتير...</p>}
                {!invoicesLoading && invoices.length === 0 && <p className="p-4 text-sm text-muted-foreground">لا توجد فواتير بعد</p>}
                {!invoicesLoading && invoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{inv.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("ar-EG")}</p>
                      <button
                        type="button"
                        onClick={() => navigate(`/order-tracking?order=${encodeURIComponent(inv.order_number)}`)}
                        className="mt-2 text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      >
                        تتبع الطلب
                      </button>
                      <button
                        type="button"
                        onClick={() => void openInvoice(inv.id)}
                        disabled={!inv.invoice_url}
                        className="mt-2 mr-2 text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        عرض الفاتورة
                      </button>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{Number(inv.total).toLocaleString("ar-EG")}</p>
                      <p className="text-xs text-muted-foreground">{inv.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Shipments */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
          >
            <h2 className="font-heading text-lg px-2 text-muted-foreground">شحناتي الحالية</h2>
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2">
                <p className="text-sm font-heading">متابعة الشحن</p>
                <span className="text-xs text-muted-foreground">{activeShipments.length} شحنة نشطة</span>
              </div>

              <div className="divide-y divide-border/60">
                {invoicesLoading && <p className="p-4 text-sm text-muted-foreground">جاري تحميل الشحنات...</p>}
                {!invoicesLoading && activeShipments.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">لا توجد شحنات جارية الآن</p>
                )}

                {!invoicesLoading && activeShipments.map((inv) => {
                  const status = String(inv.status || "").toLowerCase();
                  const progress = shippingProgressMap[status] ?? 15;
                  const tone = shippingToneMap[status] || "bg-muted text-muted-foreground";
                  const barTone = shippingProgressBarMap[status] || "bg-primary";
                  return (
                    <div key={`ship-${inv.id}`} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{inv.order_number}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${tone}`}>
                            {shippingStatusMap[status] || inv.status}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{progress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${barTone} transition-all duration-500`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/order-tracking?order=${encodeURIComponent(inv.order_number)}`)}
                        className="text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      >
                        تتبع الآن
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Main Menu Items */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
          >
            {mainItems.map((it) => (
              <motion.div key={it.to} variants={itemVariants}>
                <Link 
                  to={it.to} 
                  className="flex items-center gap-4 p-4 md:p-6 border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group rounded-xl shadow-sm hover:shadow-md"
                >
                  <div className={`${it.color} p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform`}>
                    <it.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading text-base">{it.label}</p>
                    <p className="text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Settings Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
          >
            <h2 className="font-heading text-lg px-2 text-muted-foreground">أكثر خيارات</h2>
            {settingsItems.map((it) => (
              <motion.div key={it.to} variants={itemVariants}>
                {it.label === "الإعدادات" ? (
                  <button
                    onClick={handleSettingsClick}
                    className="w-full flex items-center gap-4 p-4 md:p-5 border border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group rounded-xl text-right"
                  >
                    <div className={`${it.color} p-2 bg-primary/10 rounded-lg`}>
                      <it.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-heading text-base">{it.label}</p>
                      <p className="text-xs text-muted-foreground">{it.desc}</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 opacity-30 group-hover:opacity-100" />
                  </button>
                ) : (
                  <Link 
                    to={it.to} 
                    className="flex items-center gap-4 p-4 md:p-5 border border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group rounded-xl"
                  >
                    <div className={`${it.color} p-2 bg-primary/10 rounded-lg`}>
                      <it.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-heading text-base">{it.label}</p>
                      <p className="text-xs text-muted-foreground">{it.desc}</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 opacity-30 group-hover:opacity-100" />
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Saved Addresses */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
          >
            <h2 className="font-heading text-lg px-2 text-muted-foreground">العناوين المحفوظة</h2>

            <div className="border border-border bg-card rounded-xl p-4 md:p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={addressForm.label}
                  onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="اسم العنوان (المنزل/العمل)"
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg"
                />
                <input
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="المدينة *"
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg"
                />
              </div>
              <input
                value={addressForm.address}
                onChange={(e) => setAddressForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="العنوان بالتفصيل *"
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg"
              />
              <textarea
                value={addressForm.notes}
                onChange={(e) => setAddressForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="ملاحظات"
                rows={2}
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveAddress}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                >
                  {editingAddressId ? "تحديث العنوان" : "حفظ عنوان جديد"}
                </button>
                {editingAddressId && (
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="px-4 py-2 rounded-lg border border-border"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {savedAddresses.length === 0 && (
                <p className="text-sm text-muted-foreground px-2">لا توجد عناوين محفوظة بعد</p>
              )}
              {savedAddresses.map((addr) => (
                <div key={addr.id} className="border border-border rounded-xl p-3 bg-card/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-sm">
                        {addr.label} {addr.isDefault ? <span className="text-xs text-primary">(افتراضي)</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{addr.city} - {addr.address}</p>
                      {addr.notes ? <p className="text-xs text-muted-foreground mt-1">{addr.notes}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {!addr.isDefault && (
                        <button type="button" onClick={() => setDefaultAddress(addr)} className="text-xs px-2 py-1 border rounded">
                          افتراضي
                        </button>
                      )}
                      <button type="button" onClick={() => editAddress(addr)} className="text-xs px-2 py-1 border rounded">
                        تعديل
                      </button>
                      <button type="button" onClick={() => deleteAddress(addr.id)} className="text-xs px-2 py-1 border rounded text-destructive border-destructive/40">
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Logout Button */}
          <motion.button 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5 }}
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-4 p-4 md:p-5 border border-destructive/50 bg-destructive/5 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300 mt-8 rounded-xl font-heading text-base"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </motion.button>

          {/* Edit Profile Form Modal */}
          <AnimatePresence>
            {editMode && (
              <>
                {/* Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleCancelEdit}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                />
                
                {/* Form Container */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
                >
                  <div dir="rtl" className="w-full md:w-full md:max-w-lg bg-background border border-border rounded-2xl md:rounded-3xl shadow-2xl text-right">
                    {/* Form Header */}
                    <div className="relative overflow-hidden p-6 md:p-8 border-b border-border/50">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
                      <div className="relative flex items-center justify-between">
                        <h2 className="font-heading text-2xl md:text-3xl">تحديث البيانات</h2>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          disabled={formLoading}
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSaveProfile} className="p-6 md:p-8 space-y-6">
                      {/* Notification */}
                      <AnimatePresence>
                        {notification && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex items-center gap-3 p-4 rounded-lg border ${
                              notification.type === "success"
                                ? "bg-green-500/10 border-green-500/30 text-green-700"
                                : "bg-red-500/10 border-red-500/30 text-red-700"
                            }`}
                          >
                            {notification.type === "success" ? (
                              <Check className="w-5 h-5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            )}
                            <span className="text-sm">{notification.message}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Avatar Section */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium">الصورة الشخصية</label>
                        <div className="flex flex-col items-center gap-4">
                          {/* Avatar Preview */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 0.7, opacity: 1 }}
                            className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center"
                          >
                            {avatarPreview ? (
                              <img
                                src={avatarPreview}
                                loading="lazy"
                                alt="Avatar Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="w-10 h-10 text-muted-foreground" />
                            )}
                          </motion.div>

                          {/* Upload Button */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={formLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">تحميل صورة</span>
                          </button>
                        </div>
                      </div>

                      {/* Full Name Input */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium">الاسم الكامل</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="أدخل اسمك الكامل"
                          disabled={formLoading}
                          className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Phone Number Input */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium">رقم الهاتف (اختياري)</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="أدخل رقم هاتفك"
                          disabled={formLoading}
                          className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Form Actions */}
                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={formLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-background rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30"
                        >
                          {formLoading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full"
                              />
                              <span>جاري الحفظ...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>حفظ التغييرات</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={formLoading}
                          className="flex-1 px-6 py-2.5 bg-muted/50 hover:bg-muted border border-border rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          إلغاء
                        </button>
                      </div>
                      {/* Region Input */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium">المحافظة</label>

                        <select
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          disabled={formLoading}
                          className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">اختر المحافظة</option>
                          <option value="عدن">عدن</option>
                          <option value="صنعاء">صنعاء</option>
                          <option value="تعز">تعز</option>
                          <option value="حضرموت">حضرموت</option>
                          <option value="إب">إب</option>
                          <option value="الحديدة">الحديدة</option>
                          <option value="ذمار">ذمار</option>
                          <option value="لحج">لحج</option>
                          <option value="أبين">أبين</option>
                          <option value="شبوة">شبوة</option>
                          <option value="المهرة">المهرة</option>
                          <option value="مأرب">مأرب</option>
                          <option value="البيضاء">البيضاء</option>
                          <option value="الجوف">الجوف</option>
                          <option value="صعدة">صعدة</option>
                          <option value="ريمة">ريمة</option>
                          <option value="الضالع">الضالع</option>
                          <option value="حجة">حجة</option>
                          <option value="عمران">عمران</option>
                          <option value="المحويت">المحويت</option>
                        </select>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountPage;