import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  Heart,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Receipt,
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

  const [addressForm, setAddressForm] = useState({
    label: "",
    city: "",
    address: "",
    notes: "",
  });

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [invoices, setInvoices] = useState<
    Array<{
      id: string;
      order_number: string;
      total: number;
      status: string;
      created_at: string;
      invoice_url: string | null;
    }>
  >([]);

  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { favorites, syncWithDatabase } = useFavorites();
  const { logout } = useAuthActions();

  const latestOrderNumber = invoices[0]?.order_number || "";

  /* =========================================================
     CUSTOMER
  ========================================================= */

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

        if (customerData.phone && customerData.id) {
          const { data, error } = await (supabase as any).rpc("customer_self", {
            _id: customerData.id,
            _phone: customerData.phone,
          });

          if (!error && data && data.length) {
            const fresh = {
              ...data[0],
              region: data[0].region || data[0].country,
            };

            setCustomer(fresh);

            setUser({
              id: fresh.id || customerData.id,
              user_metadata: {
                full_name: fresh.name,
                phone_number: fresh.phone,
                region: fresh.region,
                avatar_url: fresh.avatar_url,
              },
              created_at: fresh.created_at || customerData.created_at || new Date().toISOString(),
            });

            localStorage.setItem("customer", JSON.stringify(fresh));
          }
        }
      } catch (error) {
        console.error(error);

        localStorage.removeItem("customer");

        navigate("/auth");
      }

      setLoading(false);
    };

    void loadCustomer();
  }, [navigate]);

  const fetchCustomer = async () => {
    const phone = localStorage.getItem("customer_phone") || user?.user_metadata?.phone_number;

    if (!phone || !customer?.id) return;

    const { data, error } = await (supabase as any).rpc("customer_self", {
      _id: customer.id,
      _phone: phone,
    });

    if (!error && data && data.length) {
      setCustomer({
        ...data[0],
        region: data[0].region || data[0].country,
      });
    }
  };

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
      const { data: existing, error } = await (supabase as any)
        .from("customer_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        if (active) {
          setSavedAddresses(migrateLegacyCheckoutInfo(user.id));
        }

        return;
      }

      const migrationKey = `flamingopark-addresses-db-synced:${user.id}`;

      let rows = existing || [];

      if (!localStorage.getItem(migrationKey) && rows.length === 0) {
        const legacy = migrateLegacyCheckoutInfo(user.id);

        if (legacy.length) {
          const { data: inserted, error: insertError } = await (supabase as any)
            .from("customer_addresses")
            .insert(
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
            )
            .select();

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
    void syncWithDatabase(user.id);

    return () => {
      active = false;
    };
  }, [user?.id, syncWithDatabase]);

  /* =========================================================
     INVOICES + ORDERS
  ========================================================= */

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!customer?.id) return;

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
  }, [customer?.id, customer?.phone]);

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
     ADDRESS ACTIONS
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

    const isDefault = savedAddresses.length === 0 || savedAddresses.find((address) => address.id === id)?.isDefault === true;

    if (isDefault) {
      await (supabase as any)
        .from("customer_addresses")
        .update({
          is_default: false,
        })
        .eq("user_id", user.id);
    }

    const { data, error } = await (supabase as any)
      .from("customer_addresses")
      .upsert({
        id,
        user_id: user.id,
        label: addressForm.label.trim() || `عنوان ${savedAddresses.length + 1}`,
        recipient_name: String(user.user_metadata?.full_name || customer?.name || ""),
        phone: String(user.user_metadata?.phone_number || customer?.phone || ""),
        city: addressForm.city.trim(),
        address_line1: addressForm.address.trim(),
        notes: addressForm.notes.trim() || null,
        is_default: isDefault,
      })
      .select()
      .single();

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
      message: "تم حفظ العنوان",
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

    document.getElementById("saved-address-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const deleteAddress = async (id: string) => {
    if (!user?.id) return;

    const { error } = await (supabase as any)
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

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

    await (supabase as any)
      .from("customer_addresses")
      .update({
        is_default: false,
      })
      .eq("user_id", user.id);

    const { error } = await (supabase as any)
      .from("customer_addresses")
      .update({
        is_default: true,
      })
      .eq("id", address.id)
      .eq("user_id", user.id);

    if (error) {
      setNotification({
        type: "error",
        message: "فشل تعيين العنوان الافتراضي",
      });

      return;
    }

    const next = upsertSavedAddress(user.id, {
      ...address,
      isDefault: true,
    });

    setSavedAddresses(next);

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

    setAvatar(file);

    const reader = new FileReader();

    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     PROFILE
  ========================================================= */

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!fullName.trim()) {
      setNotification({
        type: "error",
        message: "الاسم الكامل مطلوب",
      });

      return;
    }

    setFormLoading(true);

    try {
      let avatarUrl = String(customer?.avatar_url || user?.user_metadata?.avatar_url || "");

      if (avatar) {
        const safeName = avatar.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        const path = `avatars/${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage.from("uploads").upload(path, avatar, {
          upsert: true,
          cacheControl: "3600",
        });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(path);

          avatarUrl = publicData.publicUrl;
        } else {
          setNotification({
            type: "error",
            message: "فشل رفع الصورة: " + uploadError.message,
          });
        }
      } else if (avatarPreview && !avatarPreview.startsWith("data:")) {
        avatarUrl = avatarPreview;
      }

      const { error } = await (supabase as any).rpc("customer_update_self", {
        _id: customer.id,
        _phone: customer.phone,
        _name: fullName.trim(),
        _region: region.trim(),
        _avatar_url: avatarUrl || "",
      });

      if (error) {
        setNotification({
          type: "error",
          message: "فشل تحديث البيانات: " + error.message,
        });
      } else {
        setNotification({
          type: "success",
          message: "تم تحديث بياناتك بنجاح",
        });

        const updatedCustomer = {
          ...customer,
          name: fullName.trim(),
          phone: phoneNumber.trim(),
          region: region.trim(),
          avatar_url: avatarUrl || customer.avatar_url || null,
        };

        setCustomer(updatedCustomer);

        setUser((current: any) => ({
          ...current,
          user_metadata: {
            ...current?.user_metadata,
            full_name: updatedCustomer.name,
            phone_number: updatedCustomer.phone,
            region: updatedCustomer.region,
            avatar_url: updatedCustomer.avatar_url,
          },
        }));

        localStorage.setItem("customer", JSON.stringify(updatedCustomer));

        window.setTimeout(() => {
          setEditMode(false);
          setAvatar(null);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);

      setNotification({
        type: "error",
        message: "حدث خطأ أثناء التحديث",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);

    setAvatar(null);
    setAvatarPreview(customer?.avatar_url || "");

    setNotification(null);
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = async () => {
    localStorage.removeItem("customer");
    localStorage.removeItem("customer_phone");

    await logout({
      redirectTo: "/home",
    });
  };

  const handleSettingsClick = (event: React.MouseEvent) => {
    event.preventDefault();

    setFullName(customer?.name || "");
    setPhoneNumber(customer?.phone || "");
    setRegion(customer?.region || "");
    setAvatarPreview(customer?.avatar_url || "");

    setEditMode(true);
  };

  /* =========================================================
     INVOICE
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
      desc: "الطلبات والفواتير",
    },
  ];

  /* =========================================================
     RENDER
  ========================================================= */

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
                    <img src={customer.avatar_url} alt={customer?.name || "الصورة الشخصية"} className="h-full w-full object-cover" />
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
                  <span className="h-[2px] w-4 bg-[#D4777D]" />
                  <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">MY FLAMINGO</span>
                </div>

                <h1 className="truncate text-[21px] font-semibold tracking-[-0.03em] text-[#403230] md:text-[27px]">{customer?.name || "أهلاً بك"}</h1>

                <p className="mt-1 truncate text-[8px] text-[#8F807B] md:text-[9px]">{customer?.phone || "لا يوجد رقم هاتف"}</p>

                {customer?.region && (
                  <div className="mt-1 flex items-center gap-1 text-[#A1938E]">
                    <MapPin className="h-3 w-3 stroke-[1.5]" />
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

            <p className="mt-3 text-center text-[6px] text-[#AA9C97]">عضو منذ {new Date(user?.created_at).toLocaleDateString("ar-EG")}</p>
          </section>

          {/* =====================================================
              GLOBAL NOTIFICATION
          ===================================================== */}

          {notification && (
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

          <section className="px-3 pb-2 pt-5 md:px-6 md:pt-7">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">QUICK ACCESS</span>
                <h2 className="mt-1 text-[15px] font-semibold text-[#443633] md:text-[18px]">حسابي</h2>
              </div>
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
              ACTIVE SHIPMENTS
          ===================================================== */}

          <section className="px-3 pt-6 md:px-6" id="account-shipments">
            <div className="mb-3 flex items-end justify-between">
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
                        <div>
                          <p className="text-[10px] font-semibold text-[#493B38]">{invoice.order_number}</p>

                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`rounded-full px-2 py-1 text-[6px] font-medium ${tone}`}>{shippingStatusMap[status] || invoice.status}</span>

                            <span className="text-[6px] text-[#A49691]">{progress}%</span>
                          </div>
                        </div>

                        <button type="button" onClick={() => navigate(`/order-tracking?order=${encodeURIComponent(invoice.order_number)}`)} className="flex h-8 items-center gap-1 rounded-full border border-[#E2D4D0] px-3 text-[7px] font-medium text-[#A65B61]">
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

          <section className="scroll-mt-24 px-3 pt-7 md:px-6" id="account-orders">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
                  <h2 className="text-[15px] font-semibold text-[#443633] md:text-[18px]">فواتيري</h2>
                </div>

                <p className="mt-1 text-[7px] text-[#9F918C]">آخر 20 طلبًا</p>
              </div>

              <Link to="/my-orders" className="flex items-center gap-1 text-[7px] font-medium text-[#B76168]">
                عرض الطلبات
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

                        <span className={`mt-1.5 inline-block rounded-full px-2 py-1 text-[6px] ${shippingToneMap[status] || "bg-[#F4F0EE] text-[#857773]"}`}>
                          {shippingStatusMap[status] || invoice.status}
                        </span>
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

            {/* ADDRESS FORM */}

            <div id="saved-address-form" className="rounded-[16px] border border-[#EAE0DC] bg-white p-3 md:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-[#4D403C]">{editingAddressId ? "تعديل العنوان" : "إضافة عنوان"}</p>
                  <p className="mt-1 text-[6px] text-[#A49792]">{editingAddressId ? "عدّل البيانات ثم احفظ التغييرات" : "أضف عنوان توصيل جديد"}</p>
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

            {/* SAVED */}

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
            <h2 className="mb-3 text-[15px] font-semibold text-[#443633] md:text-[18px]">الإعدادات</h2>

            <button type="button" onClick={handleSettingsClick} className="flex w-full items-center gap-3 rounded-[14px] border border-[#EAE0DC] bg-white p-3.5 text-right active:bg-[#FFF8F6]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAECE9]">
                <Settings className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold text-[#4D403C]">تحديث بياناتك الشخصية</p>
                <p className="mt-1 text-[6px] text-[#A49792]">الاسم، الهاتف، المحافظة والصورة</p>
              </div>

              <ChevronLeft className="h-3.5 w-3.5 stroke-[1.4] text-[#AA9C97]" />
            </button>
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
            EDIT PROFILE
        ========================================================= */}

        <AnimatePresence>
          {editMode && (
            <>
              <motion.button type="button" aria-label="إغلاق نافذة التعديل" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onClick={handleCancelEdit} className="fixed inset-0 z-[80] bg-black/25" />

              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 bottom-0 z-[90] max-h-[92vh] overflow-y-auto rounded-t-[24px] bg-[#FFFDFC] md:inset-auto md:left-1/2 md:top-1/2 md:w-[460px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]" dir="rtl">
                <div className="sticky top-0 z-10 border-b border-[#ECE2DE] bg-[#FFFDFC] px-4 pb-4 pt-3 md:px-5 md:pt-5">
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

                <form onSubmit={handleSaveProfile} className="space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 md:px-5 md:pb-5">
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

                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={formLoading} className="mt-2 flex items-center gap-1.5 text-[7px] font-medium text-[#B86168]">
                      <Upload className="h-3 w-3" />
                      تغيير الصورة
                    </button>
                  </div>

                  {/* NAME */}

                  <label className="block">
                    <span className="mb-1.5 block text-[8px] font-medium text-[#655651]">الاسم الكامل</span>

                    <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="أدخل اسمك الكامل" disabled={formLoading} className="h-[44px] w-full rounded-[12px] border border-[#E6DBD7] bg-white px-3 text-[9px] text-[#4F423E] outline-none placeholder:text-[#AA9D97] focus:border-[#D8AAA8] disabled:opacity-50" />
                  </label>

                  {/* PHONE */}

                  <label className="block">
                    <span className="mb-1.5 block text-[8px] font-medium text-[#655651]">رقم الهاتف</span>

                    <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="أدخل رقم الهاتف" disabled={formLoading} className="h-[44px] w-full rounded-[12px] border border-[#E6DBD7] bg-white px-3 text-[9px] text-[#4F423E] outline-none placeholder:text-[#AA9D97] focus:border-[#D8AAA8] disabled:opacity-50" />
                  </label>

                  {/* REGION */}

                  <label className="block">
                    <span className="mb-1.5 block text-[8px] font-medium text-[#655651]">المحافظة</span>

                    <select value={region} onChange={(event) => setRegion(event.target.value)} disabled={formLoading} className="h-[44px] w-full rounded-[12px] border border-[#E6DBD7] bg-white px-3 text-[9px] text-[#4F423E] outline-none focus:border-[#D8AAA8] disabled:opacity-50">
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
                  </label>

                  {/* MODAL NOTIFICATION */}

                  {notification && (
                    <div className={`flex items-center gap-2 rounded-[11px] border px-3 py-2.5 ${notification.type === "success" ? "border-[#CFE1D1] bg-[#F2F8F3] text-[#527358]" : "border-[#E9C7C5] bg-[#FFF3F2] text-[#A85B5D]"}`}>
                      {notification.type === "success" ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}

                      <span className="text-[8px]">{notification.message}</span>
                    </div>
                  )}

                  {/* ACTIONS */}

                  <div className="grid grid-cols-[1.4fr_.8fr] gap-2 pt-1">
                    <button type="submit" disabled={formLoading} className="flex h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#D4777D] text-[9px] font-semibold text-white disabled:opacity-50">
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

                    <button type="button" onClick={handleCancelEdit} disabled={formLoading} className="h-[44px] rounded-[12px] border border-[#DFD3CF] bg-white text-[9px] font-medium text-[#685A55] disabled:opacity-50">
                      إلغاء
                    </button>
                  </div>
                </form>
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