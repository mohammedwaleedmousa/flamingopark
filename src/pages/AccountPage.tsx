import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Phone,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import LoadingScreen from "@/components/LoadingScreen";

import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuthActions } from "@/hooks/useAuthActions";
import { loadCustomerSession, setCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { useStore } from "@/store/useStore";

import {
  SavedAddress,
  getSavedAddresses,
  migrateLegacyCheckoutInfo,
  removeSavedAddress,
  upsertSavedAddress,
} from "@/lib/savedAddresses";

const YEMEN_REGIONS = [
  "عدن",
  "صنعاء",
  "تعز",
  "حضرموت",
  "إب",
  "الحديدة",
  "ذمار",
  "لحج",
  "أبين",
  "شبوة",
  "المهرة",
  "مأرب",
  "البيضاء",
  "الجوف",
  "صعدة",
  "ريمة",
  "الضالع",
  "حجة",
  "عمران",
  "المحويت",
];

type Invoice = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  invoice_url: string | null;
};

const AccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<{ id: string; user_metadata: Record<string, unknown>; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [region, setRegion] = useState("");

  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressForm, setAddressForm] = useState({ label: "", city: "", address: "", notes: "" });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { favorites, syncWithDatabase } = useFavorites();
  const { logout } = useAuthActions();
  const setStoreCustomer = useStore((state) => state.setCustomer);

  const latestOrderNumber = invoices[0]?.order_number || "";

  const filteredRegions = useMemo(() => {
    const query = regionSearch.trim();

    if (!query) return YEMEN_REGIONS;

    return YEMEN_REGIONS.filter((item) => item.includes(query));
  }, [regionSearch]);

  /* =========================================================
     LOAD CUSTOMER
  ========================================================= */

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const customerData = await loadCustomerSession();
        if (!customerData) {
          navigate("/auth", { replace: true });
          return;
        }

        setCustomer(customerData);
        setUser({
          id: customerData.userId,
          user_metadata: {
            full_name: customerData.name,
            phone_number: customerData.phone,
            region: customerData.region,
            avatar_url: customerData.avatar_url,
          },
          created_at: customerData.created_at || new Date().toISOString(),
        });
      } catch (error) {
        console.error(error);
        navigate("/auth", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    void loadCustomer();
  }, [navigate]);

  /* =========================================================
     FETCH CUSTOMER
  ========================================================= */

  const fetchCustomer = async () => {
    const fresh = await loadCustomerSession();
    if (!fresh) return;
    setCustomer(fresh);
    setStoreCustomer({ id: fresh.id, userId: fresh.userId, name: fresh.name, phone: fresh.phone, region: fresh.region });
  };

  /* =========================================================
     PROFILE FORM VALUES
  ========================================================= */

  useEffect(() => {
    if (!customer) return;

    setFullName(customer.name || "");
    setPhoneNumber(customer.phone || "");
    setRegion(customer.region || "");
    setAvatarPreview(customer.avatar_url || "");
  }, [customer]);

  /* =========================================================
     ADDRESSES + FAVORITES SYNC
  ========================================================= */

  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    const syncAddresses = async () => {
      const { data: existing, error } = await (supabase as any).from("customer_addresses").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });

      if (error) {
        if (active) {
          const localAddresses = getSavedAddresses(user.id);

          if (localAddresses.length > 0) {
            setSavedAddresses(localAddresses);
          } else {
            setSavedAddresses(migrateLegacyCheckoutInfo(user.id));
          }
        }

        return;
      }

      const migrationKey = `flamingopark-addresses-db-synced:${user.id}`;

      let rows = existing || [];

      if (!localStorage.getItem(migrationKey) && rows.length === 0) {
        const legacy = migrateLegacyCheckoutInfo(user.id);

        if (legacy.length) {
          const { data: inserted, error: insertError } = await (supabase as any).from("customer_addresses").insert(
            legacy.map((address) => ({
              id: address.id,
              user_id: user.id,
              label: address.label,
              recipient_name: address.name || "",
              phone: address.phone || "",
              city: address.city,
              address_line1: address.address,
              notes: address.notes || null,
              is_default: !!address.isDefault,
            })),
          ).select();

          if (!insertError) {
            rows = inserted || [];

            localStorage.setItem(migrationKey, "1");
          }
        } else {
          localStorage.setItem(migrationKey, "1");
        }
      }

      if (active) {
        setSavedAddresses(
          rows.map((address: any) => ({
            id: address.id,
            label: address.label,
            name: address.recipient_name,
            phone: address.phone,
            city: address.city,
            address: address.address_line1,
            notes: address.notes || "",
            isDefault: address.is_default,
            updatedAt: address.updated_at,
          })),
        );
      }
    };

    void syncAddresses();
    void syncWithDatabase(user.id, customer?.id);

    return () => {
      active = false;
    };
  }, [user?.id, customer?.id, syncWithDatabase]);

  /* =========================================================
     INVOICES
  ========================================================= */

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.id) return;

      setInvoicesLoading(true);

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, order_number, total, status, created_at, invoice_url")
          .eq("owner_user_id", user.id)
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

    void fetchInvoices();

    const intervalId = window.setInterval(fetchInvoices, 15000);

    const onFocus = () => {
      void fetchInvoices();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchInvoices();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);

      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id]);

  /* =========================================================
     ORDERS HASH
  ========================================================= */

  useEffect(() => {
    if (location.hash !== "#orders") return;

    const element = document.getElementById("account-orders");

    if (!element) return;

    const timer = window.setTimeout(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [location.hash, invoices.length]);

  /* =========================================================
     LOCK PAGE WHEN MODALS OPEN
  ========================================================= */

  useEffect(() => {
    if (!editMode && !regionPickerOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editMode, regionPickerOpen]);

  /* =========================================================
     ADDRESS FUNCTIONS
  ========================================================= */

  const resetAddressForm = () => {
    setAddressForm({
      label: "",
      city: "",
      address: "",
      notes: "",
    });

    setEditingAddressId(null);
  };

  const saveAddress = async () => {
    if (!user?.id) return;

    if (!addressForm.city.trim() || !addressForm.address.trim()) {
      setNotification({
        type: "error",
        message: "المدينة والعنوان مطلوبان",
      });

      return;
    }

    const id = editingAddressId || crypto.randomUUID();

    const currentAddress = savedAddresses.find((address) => address.id === id);

    const isDefault = savedAddresses.length === 0 || currentAddress?.isDefault === true;

    if (isDefault) {
      await (supabase as any).from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
    }

    const { data, error } = await (supabase as any).from("customer_addresses").upsert({
      id,
      user_id: user.id,
      label: addressForm.label.trim() || `عنوان ${savedAddresses.length + 1}`,
      recipient_name: String(customer?.name || user.user_metadata?.full_name || ""),
      phone: String(customer?.phone || user.user_metadata?.phone_number || ""),
      city: addressForm.city.trim(),
      address_line1: addressForm.address.trim(),
      notes: addressForm.notes.trim() || null,
      is_default: isDefault,
    }).select().single();

    if (error) {
      setNotification({
        type: "error",
        message: "فشل حفظ العنوان",
      });

      return;
    }

    const next = upsertSavedAddress(user.id, {
      id: data.id,
      label: data.label,
      name: data.recipient_name,
      phone: data.phone,
      city: data.city,
      address: data.address_line1,
      notes: data.notes || "",
      isDefault: data.is_default,
    });

    setSavedAddresses(next);

    resetAddressForm();

    setNotification({
      type: "success",
      message: editingAddressId ? "تم تحديث العنوان" : "تم حفظ العنوان",
    });
  };

  const editAddress = (address: SavedAddress) => {
    setEditingAddressId(address.id);

    setAddressForm({
      label: address.label || "",
      city: address.city || "",
      address: address.address || "",
      notes: address.notes || "",
    });

    window.setTimeout(() => {
      document.getElementById("saved-address-form")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  const deleteAddress = async (id: string) => {
    if (!user?.id) return;

    const { error } = await (supabase as any).from("customer_addresses").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      setNotification({
        type: "error",
        message: "فشل حذف العنوان",
      });

      return;
    }

    const next = removeSavedAddress(user.id, id);

    setSavedAddresses(next);

    if (editingAddressId === id) {
      resetAddressForm();
    }

    setNotification({
      type: "success",
      message: "تم حذف العنوان",
    });
  };

  const setDefaultAddress = async (address: SavedAddress) => {
    if (!user?.id) return;

    await (supabase as any).from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);

    const { error } = await (supabase as any).from("customer_addresses").update({ is_default: true }).eq("id", address.id).eq("user_id", user.id);

    if (error) {
      setNotification({
        type: "error",
        message: "فشل تعيين العنوان الافتراضي",
      });

      return;
    }

    upsertSavedAddress(user.id, {
      ...address,
      isDefault: true,
    });

    setSavedAddresses((current) =>
      current.map((item) => ({
        ...item,
        isDefault: item.id === address.id,
      })),
    );

    setNotification({
      type: "success",
      message: "تم تعيين العنوان الافتراضي",
    });
  };

  /* =========================================================
     AVATAR
  ========================================================= */

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!allowedTypes.has(file.type)) {
      setNotification({ type: "error", message: "الصورة يجب أن تكون بصيغة JPG أو PNG أو WebP" });
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotification({ type: "error", message: "حجم الصورة يجب ألا يتجاوز 5 ميجابايت" });
      event.target.value = "";
      return;
    }

    setAvatar(file);
    setNotification(null);

    const reader = new FileReader();

    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !customer) return;

    const normalizedName = fullName.trim();
    const normalizedRegion = region.trim();

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      setNotification({
        type: "error",
        message: "الاسم يجب أن يكون بين حرفين و100 حرف",
      });

      return;
    }

    if (!YEMEN_REGIONS.includes(normalizedRegion)) {
      setNotification({ type: "error", message: "اختر محافظة يمنية صحيحة" });
      return;
    }

    setFormLoading(true);

    try {
      let avatarUrl = String(customer?.avatar_url || user?.user_metadata?.avatar_url || "");

      if (avatar) {
        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };
        const extension = extensionByType[avatar.type];

        if (!extension || avatar.size > 5 * 1024 * 1024) {
          throw new Error("invalid_avatar");
        }

        const path = `avatars/${user.id}/avatar.${extension}`;

        const { error: uploadError } = await supabase.storage.from("uploads").upload(path, avatar, {
          upsert: true,
          cacheControl: "3600",
          contentType: avatar.type,
        });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(path);
        avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
      } else if (avatarPreview && !avatarPreview.startsWith("data:")) {
        avatarUrl = avatarPreview;
      }

      const { data, error } = await (supabase as any).rpc("update_customer_profile", {
        p_name: normalizedName,
        p_region: normalizedRegion,
        p_avatar_url: avatarUrl || null,
      });

      if (error) throw error;

      const profile = Array.isArray(data) ? data[0] : data;
      const updatedCustomer: CustomerSession = {
        id: profile?.id || customer.id,
        userId: user.id,
        name: profile?.name || normalizedName,
        phone: customer.phone,
        country: profile?.country || customer.country || "YE",
        region: profile?.region || normalizedRegion,
        avatar_url: profile?.avatar_url ?? avatarUrl ?? null,
        created_at: profile?.created_at || customer.created_at,
      };

      setCustomer(updatedCustomer);

      setUser((current) => current ? ({
        ...current,
        user_metadata: {
          ...current.user_metadata,
          full_name: updatedCustomer.name,
          phone_number: updatedCustomer.phone,
          region: updatedCustomer.region,
          avatar_url: updatedCustomer.avatar_url,
        },
      }) : current);

      setCustomerSession(updatedCustomer);
      setStoreCustomer({
        id: updatedCustomer.id,
        userId: updatedCustomer.userId,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        region: updatedCustomer.region,
      });

      setNotification({
        type: "success",
        message: "تم تحديث بياناتك بنجاح",
      });

      void fetchCustomer();

      window.setTimeout(() => {
        setEditMode(false);
        setAvatar(null);
      }, 900);
    } catch (error) {
      console.error("Error updating profile:", error);

      setNotification({
        type: "error",
        message: error instanceof Error && error.message === "invalid_avatar" ? "ملف الصورة غير صالح" : "تعذر تحديث البيانات الآن",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setRegionPickerOpen(false);

    setAvatar(null);
    setAvatarPreview(customer?.avatar_url || "");

    setFullName(customer?.name || "");
    setPhoneNumber(customer?.phone || "");
    setRegion(customer?.region || "");

    setNotification(null);
  };

  const handleSettingsClick = (event: React.MouseEvent) => {
    event.preventDefault();

    setFullName(customer?.name || "");
    setPhoneNumber(customer?.phone || "");
    setRegion(customer?.region || "");
    setAvatarPreview(customer?.avatar_url || "");

    setNotification(null);

    setEditMode(true);
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = async () => {
    await logout({
      redirectTo: "/home",
    });
  };

  /* =========================================================
     INVOICE ACCESS
  ========================================================= */

  const openInvoice = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("invoice-access", {
        body: {
          action: "signed_url",
          orderId,
        },
      });

      if (error || !data?.signedUrl) {
        throw error || new Error("Invoice unavailable");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      setNotification({
        type: "error",
        message: "تعذر فتح الفاتورة",
      });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  /* =========================================================
     DATA
  ========================================================= */

  const invoiceTotal = invoices.reduce((sum, invoice) => {
    return sum + Number(invoice.total || 0);
  }, 0);

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
    pending: "bg-[#FFF5DD] text-[#A57527]",
    confirmed: "bg-[#EEF4FF] text-[#5575A8]",
    processing: "bg-[#F2EFFF] text-[#695B9D]",
    shipped: "bg-[#EDF7FC] text-[#4C7F98]",
    out_for_delivery: "bg-[#EAF8F7] text-[#4C8783]",
    delivered: "bg-[#EDF7EE] text-[#527A57]",
    cancelled: "bg-[#FFF0F0] text-[#B75C5C]",
    canceled: "bg-[#FFF0F0] text-[#B75C5C]",
  };

  const shippingProgressBarMap: Record<string, string> = {
    pending: "bg-[#D9AA53]",
    confirmed: "bg-[#7592BF]",
    processing: "bg-[#8375B1]",
    shipped: "bg-[#68A0B9]",
    out_for_delivery: "bg-[#62A09B]",
    delivered: "bg-[#6C986F]",
    cancelled: "bg-[#C86B6B]",
    canceled: "bg-[#C86B6B]",
  };

  const activeShipments = invoices.filter((invoice) => {
    const status = String(invoice.status || "").toLowerCase();

    return !["delivered", "cancelled", "canceled"].includes(status);
  });

  const mainItems = [
    {
      to: "/favorites",
      icon: Heart,
      label: "المفضلة",
      desc: `${favorites.length} منتج`,
    },
    {
      to: "/cart",
      icon: ShoppingBag,
      label: "حقيبتي",
      desc: "عرض السلة الحالية",
    },
    {
      to: "/my-orders",
      icon: Package,
      label: "طلباتي",
      desc: "سجل الطلبات والفواتير",
    },
  ];

  const settingsItems = [
    {
      to: "/account",
      icon: Settings,
      label: "الإعدادات",
      desc: "تحديث بياناتك الشخصية",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        <div className="mx-auto w-full max-w-[1050px]">
          {/* =====================================================
              PROFILE
          ===================================================== */}

          <section className="border-b border-[#EEE4E0] bg-[#FFF8F6] px-4 pb-5 pt-6 md:mx-6 md:mt-6 md:rounded-[20px] md:border md:px-6 md:py-6">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-full border border-[#E7CECA] bg-[#FAE7E5] md:h-[82px] md:w-[82px]">
                  {customer?.avatar_url ? (
                    <img src={customer.avatar_url} alt={customer?.name || "الصورة الشخصية"} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-7 w-7 stroke-[1.4] text-[#C36A70]" />
                  )}
                </div>

                <button type="button" onClick={handleSettingsClick} className="absolute -bottom-0.5 -left-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#FFF8F6] bg-[#D4777D] text-white" aria-label="تعديل الملف الشخصي">
                  <Pencil className="h-3 w-3 stroke-[1.8]" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">MY FLAMINGO</span>
                </div>

                <h1 className="truncate text-[21px] font-semibold tracking-[-0.03em] text-[#403230] md:text-[27px]">{customer?.name || "أهلاً بك"}</h1>

                <div className="mt-1 flex items-center gap-1.5 text-[#8F807B]">
                  <Phone className="h-3 w-3 stroke-[1.4]" />
                  <span className="truncate text-[8px] md:text-[9px]">{customer?.phone || "لا يوجد رقم هاتف"}</span>
                </div>

                {customer?.region && (
                  <div className="mt-1 flex items-center gap-1.5 text-[#A1938E]">
                    <MapPin className="h-3 w-3 stroke-[1.4]" />
                    <span className="text-[8px]">{customer.region}</span>
                  </div>
                )}
              </div>

              <button type="button" onClick={handleSettingsClick} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#E4D6D2] bg-white px-4 text-[8px] font-medium text-[#665652] md:flex">
                <Settings className="h-3.5 w-3.5 stroke-[1.5] text-[#C66B71]" />
                تعديل الحساب
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-x-reverse divide-[#E8D8D4] border-t border-[#E9DDD9] pt-4">
              <div className="text-center">
                <span className="block text-[15px] font-semibold leading-none text-[#A9585E]">{favorites.length}</span>
                <span className="mt-1.5 block text-[6px] text-[#9E8E89]">المفضلة</span>
              </div>

              <div className="text-center">
                <span className="block text-[15px] font-semibold leading-none text-[#A9585E]">{invoices.length}</span>
                <span className="mt-1.5 block text-[6px] text-[#9E8E89]">الطلبات</span>
              </div>

              <div className="text-center">
                <span className="block text-[15px] font-semibold leading-none text-[#A9585E]">{activeShipments.length}</span>
                <span className="mt-1.5 block text-[6px] text-[#9E8E89]">قيد الشحن</span>
              </div>
            </div>

            <p className="mt-3 text-center text-[6px] text-[#AA9C97]">عضو منذ {new Date(user?.created_at || Date.now()).toLocaleDateString("ar-EG")}</p>
          </section>

          {/* =====================================================
              NOTIFICATION
          ===================================================== */}

          {notification && !editMode && (
            <div className="px-3 pt-3 md:px-6">
              <div className={`flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 ${notification.type === "success" ? "border-[#CFE1D1] bg-[#F2F8F3] text-[#527358]" : "border-[#E9C7C5] bg-[#FFF3F2] text-[#A85B5D]"}`}>
                <div className="flex items-center gap-2">
                  {notification.type === "success" ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span className="text-[8px] font-medium">{notification.message}</span>
                </div>

                <button type="button" onClick={() => setNotification(null)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              QUICK LINKS
          ===================================================== */}

          <section className="px-3 pt-5 md:px-6 md:pt-7">
            <div className="mb-3">
              <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">QUICK ACCESS</span>
              <h2 className="mt-1 text-[15px] font-semibold text-[#443633] md:text-[18px]">حسابي</h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {mainItems.map((item) => (
                <Link key={item.to} to={item.to} className="flex min-w-0 flex-col items-center rounded-[14px] border border-[#EBE1DD] bg-white px-2 py-4 text-center active:bg-[#FFF7F5]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9] text-[#C56C72]">
                    <item.icon className="h-4 w-4 stroke-[1.5]" />
                  </span>

                  <span className="mt-2 text-[9px] font-semibold text-[#4D403C]">{item.label}</span>
                  <span className="mt-1 max-w-full truncate text-[6px] text-[#A1948F]">{item.desc}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* =====================================================
              SHIPMENTS
          ===================================================== */}

          <section className="px-3 pt-7 md:px-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
                  <h2 className="text-[15px] font-semibold text-[#443633] md:text-[18px]">شحناتي الحالية</h2>
                </div>

                <p className="mt-1 text-[7px] text-[#9F918C]">{activeShipments.length} شحنة نشطة</p>
              </div>

              {latestOrderNumber && (
                <button type="button" onClick={() => navigate(`/order-tracking?order=${encodeURIComponent(latestOrderNumber)}`)} className="text-[7px] font-medium text-[#B76168]">
                  تتبع آخر طلب
                </button>
              )}
            </div>

            <div className="overflow-hidden rounded-[16px] border border-[#EAE0DC] bg-white">
              {invoicesLoading && <p className="px-4 py-5 text-[8px] text-[#9F918C]">جاري تحميل الشحنات...</p>}

              {!invoicesLoading && activeShipments.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6F1EF]">
                    <Truck className="h-4 w-4 stroke-[1.4] text-[#A99A95]" />
                  </span>

                  <div>
                    <p className="text-[9px] font-medium text-[#5E504C]">لا توجد شحنات جارية الآن</p>
                    <p className="mt-1 text-[7px] text-[#A49792]">ستظهر طلباتك النشطة هنا.</p>
                  </div>
                </div>
              )}

              {!invoicesLoading &&
                activeShipments.map((invoice, index) => {
                  const status = String(invoice.status || "").toLowerCase();
                  const progress = shippingProgressMap[status] ?? 15;
                  const tone = shippingToneMap[status] || "bg-[#F3F0EE] text-[#746762]";
                  const barTone = shippingProgressBarMap[status] || "bg-[#D4777D]";

                  return (
                    <div key={`shipment-${invoice.id}`} className={`p-4 ${index !== activeShipments.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-semibold text-[#493B38]">{invoice.order_number}</p>

                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`rounded-full px-2 py-1 text-[6px] font-medium ${tone}`}>{shippingStatusMap[status] || invoice.status}</span>
                            <span className="text-[6px] text-[#A49691]">{progress}%</span>
                          </div>
                        </div>

                        <button type="button" onClick={() => navigate(`/order-tracking?order=${encodeURIComponent(invoice.order_number)}`)} className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#E2D4D0] px-3 text-[7px] font-medium text-[#A65B61]">
                          تتبع
                          <ChevronLeft className="h-3 w-3 stroke-[1.5]" />
                        </button>
                      </div>

                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#F0EBE8]">
                        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* =====================================================
              INVOICES
          ===================================================== */}

          <section id="account-orders" className="scroll-mt-24 px-3 pt-7 md:px-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
                  <h2 className="text-[15px] font-semibold text-[#443633] md:text-[18px]">سجل فواتيري</h2>
                </div>

                <p className="mt-1 text-[7px] text-[#9F918C]">آخر 20 طلبًا</p>
              </div>

              <Link to="/my-orders" className="flex items-center gap-1 text-[7px] font-medium text-[#B76168]">
                كل الطلبات
                <ChevronLeft className="h-3 w-3 stroke-[1.5]" />
              </Link>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-[14px] border border-[#EAE0DC] bg-white px-3 py-3">
                <span className="text-[6px] text-[#A29590]">عدد الفواتير</span>
                <span className="mt-1 block text-[17px] font-semibold leading-none text-[#A9585E]">{invoices.length}</span>
              </div>

              <div className="rounded-[14px] border border-[#EAE0DC] bg-white px-3 py-3">
                <span className="text-[6px] text-[#A29590]">إجمالي الطلبات</span>
                <span className="mt-1 block truncate text-[17px] font-semibold leading-none text-[#A9585E]">{invoiceTotal.toLocaleString("ar-EG")}</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[16px] border border-[#EAE0DC] bg-white">
              {invoicesLoading && <p className="px-4 py-5 text-[8px] text-[#9F918C]">جاري تحميل الفواتير...</p>}

              {!invoicesLoading && invoices.length === 0 && <p className="px-4 py-5 text-[8px] text-[#9F918C]">لا توجد فواتير بعد</p>}

              {!invoicesLoading &&
                invoices.map((invoice, index) => {
                  const status = String(invoice.status || "").toLowerCase();

                  return (
                    <div key={invoice.id} className={`flex items-center justify-between gap-3 p-4 ${index !== invoices.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold text-[#493B38]">{invoice.order_number}</p>
                        <p className="mt-1 text-[6px] text-[#A49792]">{new Date(invoice.created_at).toLocaleDateString("ar-EG")}</p>

                        <div className="mt-2 flex items-center gap-1.5">
                          <button type="button" onClick={() => navigate(`/order-tracking?order=${encodeURIComponent(invoice.order_number)}`)} className="rounded-full border border-[#E0D2CE] px-2.5 py-1.5 text-[6px] font-medium text-[#A85D63]">
                            تتبع الطلب
                          </button>

                          <button type="button" onClick={() => void openInvoice(invoice.id)} disabled={!invoice.invoice_url} className="rounded-full border border-[#E0D2CE] px-2.5 py-1.5 text-[6px] font-medium text-[#A85D63] disabled:cursor-not-allowed disabled:opacity-35">
                            عرض الفاتورة
                          </button>
                        </div>
                      </div>

                      <div className="shrink-0 text-left">
                        <p className="text-[11px] font-semibold text-[#A9585E]">{Number(invoice.total).toLocaleString("ar-EG")}</p>

                        <span className={`mt-1.5 inline-block rounded-full px-2 py-1 text-[6px] ${shippingToneMap[status] || "bg-[#F4F0EE] text-[#857773]"}`}>{shippingStatusMap[status] || invoice.status}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* =====================================================
              ADDRESSES
          ===================================================== */}

          <section className="px-3 pt-7 md:px-6">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
                <h2 className="text-[15px] font-semibold text-[#443633] md:text-[18px]">العناوين المحفوظة</h2>
              </div>

              <p className="mt-1 text-[7px] text-[#9F918C]">احفظ عناوينك لتسريع عملية الطلب</p>
            </div>

            <div id="saved-address-form" className="rounded-[16px] border border-[#EAE0DC] bg-white p-3 md:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-[#4D403C]">{editingAddressId ? "تعديل العنوان" : "إضافة عنوان"}</p>
                  <p className="mt-1 text-[6px] text-[#A49792]">{editingAddressId ? "عدّل البيانات ثم احفظ" : "أضف عنوان توصيل جديد"}</p>
                </div>

                {editingAddressId && (
                  <button type="button" onClick={resetAddressForm} className="text-[7px] font-medium text-[#B86168]">
                    إلغاء التعديل
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} placeholder="اسم العنوان" className="h-[42px] w-full rounded-[11px] border border-[#E8DEDA] bg-[#FFFDFC] px-3 text-[9px] text-[#554744] outline-none placeholder:text-[#AFA39E] focus:border-[#DDB7B3]" />

                <input value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} placeholder="المدينة *" className="h-[42px] w-full rounded-[11px] border border-[#E8DEDA] bg-[#FFFDFC] px-3 text-[9px] text-[#554744] outline-none placeholder:text-[#AFA39E] focus:border-[#DDB7B3]" />
              </div>

              <input value={addressForm.address} onChange={(event) => setAddressForm((current) => ({ ...current, address: event.target.value }))} placeholder="العنوان بالتفصيل *" className="mt-2 h-[42px] w-full rounded-[11px] border border-[#E8DEDA] bg-[#FFFDFC] px-3 text-[9px] text-[#554744] outline-none placeholder:text-[#AFA39E] focus:border-[#DDB7B3]" />

              <textarea value={addressForm.notes} onChange={(event) => setAddressForm((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات إضافية" rows={2} className="mt-2 w-full resize-none rounded-[11px] border border-[#E8DEDA] bg-[#FFFDFC] px-3 py-3 text-[9px] text-[#554744] outline-none placeholder:text-[#AFA39E] focus:border-[#DDB7B3]" />

              <button type="button" onClick={saveAddress} className="mt-2.5 h-[42px] w-full rounded-[11px] bg-[#D4777D] text-[9px] font-semibold text-white active:bg-[#C96A71]">
                {editingAddressId ? "تحديث العنوان" : "حفظ عنوان جديد"}
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              {savedAddresses.length === 0 && (
                <div className="rounded-[14px] border border-dashed border-[#DFD3CE] px-4 py-5 text-center">
                  <MapPin className="mx-auto h-5 w-5 stroke-[1.4] text-[#C1B3AE]" />
                  <p className="mt-2 text-[8px] text-[#9D8F8A]">لا توجد عناوين محفوظة بعد</p>
                </div>
              )}

              {savedAddresses.map((address) => (
                <div key={address.id} className="rounded-[14px] border border-[#EAE0DC] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[9px] font-semibold text-[#4C3F3B]">{address.label}</p>

                        {address.isDefault && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FAEDEA] px-2 py-1 text-[6px] font-medium text-[#B15F65]">
                            <Star className="h-2.5 w-2.5 fill-[#C96F79] stroke-[#C96F79]" />
                            افتراضي
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-[7px] leading-5 text-[#8E807B]">{address.city} - {address.address}</p>

                      {address.notes && <p className="mt-1 text-[6px] text-[#A49792]">{address.notes}</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-[#F0E8E5] pt-2.5">
                    {!address.isDefault && (
                      <button type="button" onClick={() => setDefaultAddress(address)} className="rounded-full border border-[#E2D5D0] px-2.5 py-1.5 text-[6px] font-medium text-[#7B6964]">
                        تعيين افتراضي
                      </button>
                    )}

                    <button type="button" onClick={() => editAddress(address)} className="rounded-full border border-[#E2D5D0] px-2.5 py-1.5 text-[6px] font-medium text-[#7B6964]">
                      تعديل
                    </button>

                    <button type="button" onClick={() => deleteAddress(address.id)} className="mr-auto rounded-full border border-[#EACBC7] px-2.5 py-1.5 text-[6px] font-medium text-[#B96365]">
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =====================================================
              SETTINGS
          ===================================================== */}

          <section className="px-3 pt-7 md:px-6">
            <h2 className="mb-3 text-[15px] font-semibold text-[#443633] md:text-[18px]">أكثر خيارات</h2>

            {settingsItems.map((item) => (
              <button key={item.to} type="button" onClick={handleSettingsClick} className="flex w-full items-center gap-3 rounded-[14px] border border-[#EAE0DC] bg-white p-3.5 text-right active:bg-[#FFF8F6]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAECE9]">
                  <item.icon className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold text-[#4D403C]">{item.label}</p>
                  <p className="mt-1 text-[6px] text-[#A49792]">{item.desc}</p>
                </div>

                <ChevronLeft className="h-3.5 w-3.5 stroke-[1.4] text-[#AA9C97]" />
              </button>
            ))}
          </section>

          {/* =====================================================
              LOGOUT
          ===================================================== */}

          <section className="px-3 pb-10 pt-6 md:px-6">
            <button type="button" onClick={handleLogout} className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[13px] border border-[#E7C9C6] bg-[#FFF7F6] text-[9px] font-semibold text-[#B45C61] active:bg-[#FCECEA]">
              <LogOut className="h-4 w-4 stroke-[1.5]" />
              تسجيل الخروج
            </button>
          </section>
        </div>

        {/* =========================================================
            EDIT PROFILE MODAL
        ========================================================= */}

        <AnimatePresence>
          {editMode && (
            <>
              <motion.button type="button" aria-label="إغلاق نافذة التعديل" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onClick={handleCancelEdit} className="fixed inset-0 z-[80] bg-black/25" />

              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[92vh] flex-col rounded-t-[26px] bg-[#FFFDFC] shadow-[0_-10px_35px_rgba(50,35,30,.10)] md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-[460px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]" dir="rtl">
                <div className="shrink-0 border-b border-[#ECE2DE] bg-[#FFFDFC] px-4 pb-4 pt-3 md:px-5 md:pt-5">
                  <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#DED2CE] md:hidden" />

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="h-[2px] w-4 bg-[#D4777D]" />
                        <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">MY PROFILE</span>
                      </div>

                      <h2 className="text-[18px] font-semibold text-[#403230]">تحديث البيانات</h2>
                    </div>

                    <button type="button" onClick={handleCancelEdit} disabled={formLoading} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8DEDA] bg-white">
                      <X className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-5 md:pb-5">
                  {/* AVATAR */}

                  <div className="flex flex-col items-center">
                    <div className="relative h-[82px] w-[82px] overflow-hidden rounded-full border border-[#E4CECA] bg-[#FAECE9]">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="معاينة الصورة" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Camera className="h-6 w-6 stroke-[1.4] text-[#B77A7B]" />
                        </div>
                      )}
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />

                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={formLoading} className="mt-2 flex items-center gap-1.5 text-[7px] font-medium text-[#B86168] disabled:opacity-50">
                      <Upload className="h-3 w-3" />
                      تغيير الصورة
                    </button>
                  </div>

                  {/* NAME */}

                  <label className="block">
                    <span className="mb-1.5 block text-[8px] font-medium text-[#655651]">الاسم الكامل</span>

                    <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="أدخل اسمك الكامل" disabled={formLoading} className="h-[46px] w-full rounded-[13px] border border-[#E6DBD7] bg-white px-3 text-[9px] text-[#4F423E] outline-none placeholder:text-[#AA9D97] focus:border-[#D8AAA8] disabled:opacity-50" />
                  </label>

                  {/* PHONE */}

                  <label className="block">
                    <span className="mb-1.5 block text-[8px] font-medium text-[#655651]">رقم الهاتف</span>

                    <input type="tel" value={phoneNumber} readOnly aria-readonly="true" className="h-[46px] w-full cursor-not-allowed rounded-[13px] border border-[#E6DBD7] bg-[#F7F3F1] px-3 text-[9px] text-[#766965] outline-none" />
                    <span className="mt-1 block text-[6px] text-[#9F918C]">رقم الدخول ثابت لحماية الحساب. تغييره يتطلب إجراء تحقق منفصل.</span>
                  </label>

                  {/* CUSTOM REGION */}

                  <div>
                    <span className="mb-1.5 block text-[8px] font-medium text-[#655651]">المحافظة</span>

                    <button type="button" onClick={() => { if (!formLoading) { setRegionSearch(""); setRegionPickerOpen(true); } }} disabled={formLoading} className="flex h-[46px] w-full items-center justify-between rounded-[13px] border border-[#E6DBD7] bg-white px-3 text-right disabled:opacity-50">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAECE9]">
                          <MapPin className="h-3.5 w-3.5 stroke-[1.5] text-[#C96F79]" />
                        </span>

                        <div className="min-w-0">
                          <span className="block text-[6px] leading-none text-[#AA9C97]">المحافظة</span>
                          <span className={`mt-1 block truncate text-[9px] font-medium ${region ? "text-[#51433F]" : "text-[#A99C97]"}`}>{region || "اختر المحافظة"}</span>
                        </div>
                      </div>

                      <ChevronDown className="h-3.5 w-3.5 shrink-0 stroke-[1.5] text-[#B76A6E]" />
                    </button>
                  </div>

                  {/* NOTIFICATION */}

                  {notification && (
                    <div className={`flex items-center gap-2 rounded-[11px] border px-3 py-2.5 ${notification.type === "success" ? "border-[#CFE1D1] bg-[#F2F8F3] text-[#527358]" : "border-[#E9C7C5] bg-[#FFF3F2] text-[#A85B5D]"}`}>
                      {notification.type === "success" ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}

                      <span className="text-[8px]">{notification.message}</span>
                    </div>
                  )}

                  {/* ACTIONS */}

                  <div className="grid grid-cols-[1.4fr_.8fr] gap-2 pt-1">
                    <button type="submit" disabled={formLoading} className="flex h-[46px] items-center justify-center gap-2 rounded-[13px] bg-[#D4777D] text-[9px] font-semibold text-white disabled:opacity-50">
                      {formLoading ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          حفظ التغييرات
                        </>
                      )}
                    </button>

                    <button type="button" onClick={handleCancelEdit} disabled={formLoading} className="h-[46px] rounded-[13px] border border-[#DFD3CF] bg-white text-[9px] font-medium text-[#685A55] disabled:opacity-50">
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* =========================================================
            REGION PICKER
        ========================================================= */}

        <AnimatePresence>
          {regionPickerOpen && (
            <>
              <motion.button type="button" aria-label="إغلاق اختيار المحافظة" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onClick={() => setRegionPickerOpen(false)} className="fixed inset-0 z-[110] bg-black/30" />

              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 bottom-0 z-[120] flex max-h-[82vh] flex-col rounded-t-[26px] bg-[#FFFDFC] shadow-[0_-12px_35px_rgba(50,35,30,.12)] md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]" dir="rtl">
                {/* HEADER */}

                <div className="shrink-0 px-4 pt-3 md:px-5 md:pt-5">
                  <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#DDD1CD] md:hidden" />

                  <div className="flex items-start justify-between border-b border-[#EEE4E0] pb-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                        <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FLAMINGO LOCATION</span>
                      </div>

                      <h3 className="text-[18px] font-semibold text-[#403230]">اختر المحافظة</h3>

                      <p className="mt-1 text-[7px] text-[#9F918C]">حدد المحافظة المرتبطة بحسابك</p>
                    </div>

                    <button type="button" onClick={() => setRegionPickerOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8DEDA] bg-white text-[#675954]">
                      <X className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                </div>

                {/* SEARCH */}

                <div className="shrink-0 px-4 pt-3 md:px-5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-[#B09F99]" />

                    <input value={regionSearch} onChange={(event) => setRegionSearch(event.target.value)} placeholder="ابحث عن المحافظة..." className="h-[43px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-9 pl-8 text-[9px] text-[#51433F] outline-none placeholder:text-[#AEA19B] focus:border-[#DDAFAD]" />

                    {regionSearch && (
                      <button type="button" onClick={() => setRegionSearch("")} className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#F5EFEC] text-[#93847F]">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* REGIONS */}

                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-5">
                  {filteredRegions.length === 0 ? (
                    <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                      <MapPin className="h-5 w-5 stroke-[1.4] text-[#C3B4AF]" />
                      <p className="mt-2 text-[9px] font-medium text-[#6D5E59]">لا توجد نتائج</p>
                      <p className="mt-1 text-[7px] text-[#A49792]">جرّب البحث باسم محافظة أخرى</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[15px] border border-[#EAE0DC] bg-white">
                      {filteredRegions.map((item, index) => {
                        const active = region === item;

                        return (
                          <button key={item} type="button" onClick={() => { setRegion(item); setRegionPickerOpen(false); setRegionSearch(""); }} className={`flex h-[48px] w-full items-center justify-between px-3.5 text-right ${index !== filteredRegions.length - 1 ? "border-b border-[#F0E8E5]" : ""} ${active ? "bg-[#FFF0EE]" : "bg-white active:bg-[#FBF7F5]"}`}>
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-[#F5D8D5]" : "bg-[#F8F4F2]"}`}>
                                <MapPin className={`h-3.5 w-3.5 stroke-[1.5] ${active ? "text-[#C86269]" : "text-[#A99B96]"}`} />
                              </span>

                              <span className={`text-[10px] font-medium ${active ? "text-[#A95B61]" : "text-[#51433F]"}`}>{item}</span>
                            </div>

                            {active && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4777D]">
                                <Check className="h-2.5 w-2.5 stroke-[2.2] text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* REGION BOTTOM */}

                <div className="shrink-0 border-t border-[#EDE4E0] bg-[#FFFDFC] px-4 pb-[calc(env(safe-area-inset-bottom)+13px)] pt-3 md:px-5 md:pb-5">
                  <div className="grid grid-cols-[.75fr_1.4fr] gap-2.5">
                    <button type="button" onClick={() => setRegionPickerOpen(false)} className="h-[44px] rounded-[12px] border border-[#DFD3CF] bg-white text-[8px] font-medium text-[#6D5F5A]">
                      إلغاء
                    </button>

                    <button type="button" onClick={() => setRegionPickerOpen(false)} disabled={!region} className="flex h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#D4777D] text-[9px] font-semibold text-white disabled:opacity-45">
                      <Check className="h-3.5 w-3.5" />
                      تأكيد المحافظة
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default AccountPage;
