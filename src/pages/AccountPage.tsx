import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressForm, setAddressForm] = useState({ label: "", city: "", address: "", notes: "" });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [invoices, setInvoices] = useState<Array<{ id: string; order_number: string; total: number; status: string; created_at: string }>>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { favorites } = useFavorites();
  const { logout } = useAuthActions();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth", { replace: true });
      else setUser(data.user);
      setLoading(false);
    });
  }, [navigate]);

  // Initialize form fields when user data loads or edit mode is enabled
  useEffect(() => {
    if (user && editMode) {
      setFullName(user?.user_metadata?.full_name || "");
      setPhoneNumber(user?.user_metadata?.phone_number || "");
      setAvatarPreview(user?.user_metadata?.avatar_url || "");
    }
  }, [editMode, user]);

  useEffect(() => {
    if (!user?.id) return;
    const list = migrateLegacyCheckoutInfo(user.id);
    setSavedAddresses(list);
  }, [user?.id]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.id) return;
      setInvoicesLoading(true);
      try {
        const userPhone = String(user?.user_metadata?.phone_number || "").trim();
        let query = supabase
          .from("orders")
          .select("id, order_number, total, status, created_at")
          .order("created_at", { ascending: false })
          .limit(20);

        if (userPhone) {
          query = query.or(`customer_id.eq.${user.id},customer_phone.eq.${userPhone}`);
        } else {
          query = query.eq("customer_id", user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setInvoices((data || []) as Array<{ id: string; order_number: string; total: number; status: string; created_at: string }>);
      } catch {
        setInvoices([]);
      } finally {
        setInvoicesLoading(false);
      }
    };

    fetchInvoices();
  }, [user?.id, user?.user_metadata?.phone_number]);

  const resetAddressForm = () => {
    setAddressForm({ label: "", city: "", address: "", notes: "" });
    setEditingAddressId(null);
  };

  const saveAddress = () => {
    if (!user?.id) return;
    if (!addressForm.city.trim() || !addressForm.address.trim()) {
      setNotification({ type: "error", message: "المدينة والعنوان مطلوبان" });
      return;
    }
    const next = upsertSavedAddress(user.id, {
      id: editingAddressId || `addr-${Date.now()}`,
      label: addressForm.label.trim() || `عنوان ${savedAddresses.length + 1}`,
      name: user?.user_metadata?.full_name || "",
      phone: user?.user_metadata?.phone_number || "",
      city: addressForm.city.trim(),
      address: addressForm.address.trim(),
      notes: addressForm.notes.trim(),
      isDefault: savedAddresses.length === 0 || editingAddressId !== null,
    });
    setSavedAddresses(next);
    resetAddressForm();
    setNotification({ type: "success", message: "تم حفظ العنوان" });
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

  const deleteAddress = (id: string) => {
    if (!user?.id) return;
    const next = removeSavedAddress(user.id, id);
    setSavedAddresses(next);
    if (editingAddressId === id) resetAddressForm();
  };

  const setDefaultAddress = (addr: SavedAddress) => {
    if (!user?.id) return;
    const next = upsertSavedAddress(user.id, { ...addr, isDefault: true });
    setSavedAddresses(next);
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
      const updates: any = {
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
        }
      };

      // If avatar was changed and is a data URL, include it in metadata
      if (avatarPreview && avatarPreview.startsWith('data:')) {
        updates.data.avatar_url = avatarPreview;
      } else if (avatarPreview) {
        updates.data.avatar_url = avatarPreview;
      }

      const { error } = await supabase.auth.updateUser({
        data: updates.data
      });

      if (error) {
        setNotification({ type: "error", message: "فشل تحديث البيانات: " + error.message });
      } else {
        setNotification({ type: "success", message: "تم تحديث بياناتك بنجاح" });
        
        // Update local user state
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUser(data.user);
        }
        
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
    { to: "/products", icon: Package, label: "طلباتي", desc: "سجل المشتريات", color: "text-green-500" },
  ];

  const settingsItems = [
    { to: "/account", icon: Settings, label: "الإعدادات", desc: "تحديث بياناتك الشخصية", color: "text-amber-500" },
    { to: "/cart", icon: Truck, label: "شحناتي", desc: "تتبع الطلبات الحالية", color: "text-orange-500" },
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
                <User className="w-10 h-10" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="font-heading text-3xl md:text-4xl">{user?.user_metadata?.full_name || "أهلاً بك"}</h1>
                <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2 flex-wrap">
                  <Mail className="w-4 h-4" /> {user?.email}
                </p>
                <p className="text-xs text-muted-foreground mt-3">عضو منذ {new Date(user?.created_at).toLocaleDateString('ar-EG')}</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Invoices */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
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
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center"
                          >
                            {avatarPreview ? (
                              <img
                                src={avatarPreview}
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