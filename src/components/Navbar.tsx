import {
  Bell,
  CaretLeft,
  Crown,
  Globe,
  Heart,
  House,
  List,
  MagnifyingGlass,
  MapPin,
  Package,
  QrCode,
  ShoppingCart,
  SignIn,
  SignOut,
  SquaresFour,
  Tag,
  User,
} from "phosphor-react";
import type { Icon } from "phosphor-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useCurrency, getActiveCurrencies } from "@/lib/currency";
import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";
import { supabase } from "@/integrations/supabase/client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SearchSuggestion = {
  value: string;
  type: "منتج" | "ماركة" | "قسم";
};

let searchIndexCache: SearchSuggestion[] | null = null;
let searchIndexPromise: Promise<SearchSuggestion[]> | null = null;

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase("ar");

const loadSearchIndex = async () => {
  if (searchIndexCache) return searchIndexCache;
  if (searchIndexPromise) return searchIndexPromise;

  searchIndexPromise = (async () => {
    const [productsResult, brandsResult, categoriesResult] = await Promise.all([
      supabase.from("products").select("name_ar,name").eq("is_active", true).limit(1000),
      supabase.from("brands").select("name").eq("is_active", true).limit(500),
      supabase.from("categories").select("name_ar,name").eq("is_active", true).limit(500),
    ]);

    const raw: SearchSuggestion[] = [
      ...((productsResult.data || []) as Array<{ name_ar: string | null; name: string | null }>).map((row) => ({ value: String(row.name_ar || row.name || "").trim(), type: "منتج" as const })),
      ...((brandsResult.data || []) as Array<{ name: string | null }>).map((row) => ({ value: String(row.name || "").trim(), type: "ماركة" as const })),
      ...((categoriesResult.data || []) as Array<{ name_ar: string | null; name: string | null }>).map((row) => ({ value: String(row.name_ar || row.name || "").trim(), type: "قسم" as const })),
    ].filter((item) => item.value);

    searchIndexCache = Array.from(new Map(raw.map((item) => [`${item.type}:${normalizeSearch(item.value)}`, item])).values());
    return searchIndexCache;
  })();

  try {
    return await searchIndexPromise;
  } finally {
    searchIndexPromise = null;
  }
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <p className="mb-2 px-2 text-[10px] font-semibold text-[#A29590]">{label}</p>
    <div className="space-y-1">{children}</div>
  </section>
);

const NavItem = ({
  to,
  icon: Icon,
  label,
  badge,
  onNavigate,
}: {
  to: string;
  icon: Icon;
  label: string;
  badge?: number | string;
  onNavigate?: () => void;
}) => (
  <NavLink to={to} end={to === "/home"} onClick={onNavigate} className={({ isActive }) => `relative flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 transition-colors ${isActive ? "bg-[#FFF6F4] text-[#A95B61]" : "text-[#5C504C] hover:bg-[#FAF7F5]"}`}>
    {({ isActive }) => (
      <>
        {isActive && <span className="absolute right-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#D4777D]" />}

        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${isActive ? "bg-[#FAE9E7] text-[#C86970]" : "bg-[#F8F5F3] text-[#887B76]"}`}>
          <Icon size={19} weight="regular" />
        </span>

        <span className={`flex-1 text-right text-[13px] ${isActive ? "font-semibold" : "font-medium"}`}>{label}</span>

        {!!badge && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D4777D] px-1.5 text-[9px] font-bold text-white">{badge}</span>}

        <CaretLeft size={14} className={isActive ? "text-[#C86970]" : "text-[#C5B9B5]"} />
      </>
    )}
  </NavLink>
);

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchSuggestion[]>(() => searchIndexCache || []);
  const restoreScrollOnUnlockRef = useRef(true);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

  const { openCart, getCartCount, customer, setCustomer } = useStore();
  const { favorites } = useFavorites();
  const { logout } = useAuthActions();

  const cartCount = getCartCount();

  const { unreadCount } = useCustomerNotifications({
    enabled: menuOpen,
    enableToasts: false,
  });

  const { mode, setMode, short } = useCurrency();
  const searchPanelOpen = searchFocused && searchTerm.trim().length > 0;

  useEffect(() => {
    let cancelled = false;

    void loadSearchIndex().then((index) => {
      if (!cancelled) setSearchIndex(index);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const value = normalizeSearch(searchTerm);
    if (!value) return [];

    return searchIndex
      .filter((item) => normalizeSearch(item.value).includes(value))
      .sort((a, b) => {
        const aValue = normalizeSearch(a.value);
        const bValue = normalizeSearch(b.value);
        const aStarts = aValue.startsWith(value) ? 0 : 1;
        const bStarts = bValue.startsWith(value) ? 0 : 1;
        return aStarts - bStarts || a.value.localeCompare(b.value, "ar");
      })
      .slice(0, 20);
  }, [searchIndex, searchTerm]);

  useEffect(() => {
    if (!searchFocused) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previousBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const previousHtml = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };

    const preventBackgroundScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && searchResultsRef.current?.contains(target)) return;
      event.preventDefault();
    };

    restoreScrollOnUnlockRef.current = true;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
    document.addEventListener("wheel", preventBackgroundScroll, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventBackgroundScroll);
      document.removeEventListener("wheel", preventBackgroundScroll);

      body.style.position = previousBody.position;
      body.style.top = previousBody.top;
      body.style.left = previousBody.left;
      body.style.right = previousBody.right;
      body.style.width = previousBody.width;
      body.style.overflow = previousBody.overflow;
      html.style.overflow = previousHtml.overflow;
      html.style.overscrollBehavior = previousHtml.overscrollBehavior;

      if (restoreScrollOnUnlockRef.current) {
        window.scrollTo(0, scrollY);
      }

      restoreScrollOnUnlockRef.current = true;
    };
  }, [searchFocused]);

  const staticLabels: Record<string, { label: string; flag: string }> = {
    SAR: {
      label: "ريال سعودي",
      flag: "🇸🇦",
    },
    YER_SOUTH: {
      label: "ريال يمني - جنوبي",
      flag: "🇾🇪",
    },
    YER_NORTH: {
      label: "ريال يمني - شمالي",
      flag: "🇾🇪",
    },
  };

  const currencies = getActiveCurrencies().map((currency) => ({
    key: currency.code as typeof mode,
    label: staticLabels[currency.code]?.label ?? currency.meta.label,
    flag: staticLabels[currency.code]?.flag ?? "💱",
  }));

  const closeSearch = () => {
    restoreScrollOnUnlockRef.current = true;
    setSearchFocused(false);
    setSearchTerm("");
  };

  const runSearch = (value: string) => {
    const cleaned = value.trim();

    if (!cleaned) return;

    restoreScrollOnUnlockRef.current = false;
    navigate(`/products?search=${encodeURIComponent(cleaned)}`);
    setSearchTerm("");
    setSearchFocused(false);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchTerm);
  };

  const handleLogout = async () => {
    await logout();

    setCustomer(null);
    setMenuOpen(false);

    navigate("/home");
  };

  return (
    <>
      <header dir="rtl" className="fixed inset-x-0 top-0 z-50 border-b border-[#F0E5E1] bg-white">
        {searchFocused && <div aria-hidden="true" className="fixed inset-x-0 bottom-0 top-[112px] z-[55] touch-none bg-white/96 md:top-[120px]" />}

        <div className="mx-auto max-w-7xl px-4 md:px-8">
          {/* TOP ROW */}

          <div className="relative flex h-14 items-center justify-between md:h-16">
            {/* RIGHT */}

            <div className="flex items-center">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button type="button" aria-label="فتح القائمة" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5B504C] transition-colors hover:bg-[#FFF6F4] hover:text-[#B86168]">
                    <List size={22} />
                  </button>
                </SheetTrigger>

                <SheetContent side="right" dir="rtl" className="flex h-full w-[86vw] max-w-[355px] flex-col border-l border-[#EEE4E0] bg-[#FFFDFC] p-0">
                  {/* MENU HEADER */}

                  <div className="flex items-center justify-center border-b border-[#EEE4E0] px-5 py-5">
                    <Link to="/home" onClick={() => setMenuOpen(false)} className="flex items-center">
                      <img src="/icons/flamingo.jpeg" alt="فلامنجو" width={60} height={60} loading="lazy" className="h-[60px] w-[60px] object-contain" />
                    </Link>
                  </div>

                  {/* MENU */}

                  <nav className="flex-1 overflow-y-auto px-3 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {unreadCount > 0 && (
                      <button type="button" onClick={() => { setMenuOpen(false); navigate("/notifications"); }} className="mt-4 flex w-full items-center gap-3 rounded-[14px] border border-[#EFD8D5] bg-[#FFF6F4] px-4 py-3 text-right">
                        <Bell size={19} className="text-[#C86970]" />
                        <span className="flex-1 text-xs font-medium text-[#A95B61]">لديك {unreadCount} إشعار جديد</span>
                      </button>
                    )}

                    {/* SHOPPING */}

                    <Section label="التسوق">
                      <NavItem to="/home" icon={House} label="الرئيسية" onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/categories" icon={SquaresFour} label="الأقسام" onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/products" icon={Package} label="جميع المنتجات" onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/seasonal-offers" icon={Tag} label="العروض" onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/new-arrivals" icon={Package} label="وصل حديثاً" onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/best-sellers" icon={Crown} label="الأكثر مبيعاً" onNavigate={() => setMenuOpen(false)} />
                    </Section>

                    {/* ACCOUNT */}

                    <Section label="الحساب">
                      <NavItem to="/cart" icon={ShoppingCart} label="السلة" badge={cartCount || undefined} onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/favorites" icon={Heart} label="المفضلة" badge={favorites.length || undefined} onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/account" icon={User} label="حسابي" onNavigate={() => setMenuOpen(false)} />
                    </Section>

                    {/* STORE */}

                    <Section label="المتجر">
                      <NavItem to="/store-info" icon={MapPin} label="معلومات المتجر" onNavigate={() => setMenuOpen(false)} />

                      <NavItem to="/qr-code" icon={QrCode} label="باركود المتجر" onNavigate={() => setMenuOpen(false)} />
                    </Section>
                  </nav>

                  {/* MENU FOOTER */}

                  <div className="border-t border-[#EEE4E0] bg-[#FFFDFC] p-4">
                    {customer ? (
                      <button type="button" onClick={handleLogout} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E4D8D4] bg-white text-sm font-medium text-[#70625D] transition-colors hover:border-[#E2B9B5] hover:bg-[#FFF8F6] hover:text-[#B86168]">
                        <SignOut size={18} />
                        تسجيل الخروج
                      </button>
                    ) : (
                      <button type="button" onClick={() => { setMenuOpen(false); navigate("/auth"); }} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D4777D] text-sm font-semibold text-white transition-colors hover:bg-[#C96B72]">
                        <SignIn size={18} />
                        تسجيل الدخول
                      </button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* LOGO */}

            <Link to="/home" aria-label="الرئيسية" className="absolute left-1/2 -translate-x-1/2">
              <img src="/icons/flamingo.jpeg" alt="فلامنجو" width={48} height={48} fetchPriority="high" className="h-12 w-12 object-contain" />
            </Link>

            {/* LEFT */}

            <div className="flex items-center gap-0.5">
              {/* CURRENCY */}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="العملة" className="flex h-10 items-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-[#6C5E59] transition-colors hover:bg-[#FFF6F4] hover:text-[#B86168]">
                    <Globe size={17} />
                    <span>{short}</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" dir="rtl" className="w-60 rounded-[14px] border-[#E8DDD9] bg-white">
                  <DropdownMenuLabel className="text-xs text-[#5A4C48]">اختر العملة</DropdownMenuLabel>

                  <DropdownMenuSeparator className="bg-[#EEE5E1]" />

                  {currencies.map((currency) => (
                    <DropdownMenuItem key={currency.key} onClick={() => setMode(currency.key)} className={`cursor-pointer justify-between rounded-[9px] focus:bg-[#FFF5F3] ${mode === currency.key ? "bg-[#FFF5F3]" : ""}`}>
                      <span className="flex items-center gap-2 text-sm text-[#5B4D49]">
                        <span>{currency.flag}</span>
                        {currency.label}
                      </span>

                      {mode === currency.key && <span className="h-2 w-2 rounded-full bg-[#D4777D]" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* CART */}

              <button type="button" onClick={openCart} aria-label="السلة" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#5B504C] transition-colors hover:bg-[#FFF6F4] hover:text-[#B86168]">
                <ShoppingCart size={21} weight="regular" />

                {cartCount > 0 && <span className="absolute -left-1 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D4777D] px-1 text-[9px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
              </button>
            </div>
          </div>

          {/* SEARCH */}

          <form onSubmit={submitSearch} className="relative z-[70] pb-3">
            <label className="relative block">
              <MagnifyingGlass size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#A79A95]" />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="ابحث عن منتج، ماركة أو قسم..."
                enterKeyHint="search"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={searchPanelOpen && suggestions.length > 0}
                className="h-11 w-full rounded-2xl border border-[#EDE4E0] bg-[#F7F7F7] pr-11 pl-11 text-[13px] text-[#443A37] outline-none placeholder:text-[#A99D98] focus:border-[#DDB6B2] focus:bg-white"
              />
            </label>

            {searchFocused && (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={closeSearch} aria-label="إغلاق البحث" className="absolute left-3 top-[22px] z-[80] flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[20px] font-light leading-none text-[#8F817C] transition-colors hover:bg-[#F5EFED] hover:text-[#B86168] active:bg-[#F3E9E6]">
                ×
              </button>
            )}

            {searchPanelOpen && suggestions.length > 0 && (
              <div ref={searchResultsRef} role="listbox" className="absolute inset-x-0 top-[calc(100%-8px)] z-[75] max-h-[calc(100dvh-135px)] touch-pan-y overflow-y-auto overscroll-contain rounded-2xl border border-[#E8DDD9] bg-white shadow-[0_14px_35px_rgba(78,55,50,0.12)] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}-${index}`}
                    type="button"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runSearch(suggestion.value)}
                    className="flex w-full items-center gap-3 border-b border-[#F3ECE9] px-4 py-3 text-right transition-colors last:border-b-0 hover:bg-[#FFF8F6] active:bg-[#FFF3F1]"
                  >
                    <MagnifyingGlass size={15} className="shrink-0 text-[#B86A70]" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#4A3E3A]">{suggestion.value}</span>
                    <span className="shrink-0 rounded-full bg-[#F8F3F1] px-2 py-1 text-[8px] text-[#8E807B]">{suggestion.type}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </header>

      <div aria-hidden="true" className="h-[112px] md:h-[120px]" />
    </>
  );
};

export default Navbar;