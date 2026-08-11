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
  ShoppingCart,
  SignIn,
  SignOut,
  SquaresFour,
  Tag,
  User,
} from "phosphor-react";
import type { Icon } from "phosphor-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useCurrency, getActiveCurrencies } from "@/lib/currency";
import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BRAND = "#AC2471";

const Section = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <section className="mt-6">
    <p className="mb-2 px-2 text-[11px] font-semibold text-black/35">
      {label}
    </p>

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
  <NavLink
    to={to}
    end={to === "/home"}
    onClick={onNavigate}
    className={({ isActive }) =>
      `
      flex min-h-[48px] items-center gap-3
      rounded-2xl px-3
      ${
        isActive
          ? "bg-[#FFF3F8] text-[#AC2471]"
          : "text-black/70 hover:bg-black/[0.025]"
      }
      `
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={`
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-xl
          ${
            isActive
              ? "bg-white text-[#AC2471]"
              : "bg-[#FAFAFA] text-black/50"
          }
          `}
        >
          <Icon size={19} weight="regular" />
        </span>

        <span className="flex-1 text-right text-[13px] font-medium">
          {label}
        </span>

        {!!badge && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#AC2471] px-1.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}

        <CaretLeft
          size={14}
          className={isActive ? "text-[#AC2471]" : "text-black/20"}
        />
      </>
    )}
  </NavLink>
);

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [compact, setCompact] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      setCompact(window.scrollY > 70);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const staticLabels: Record<
    string,
    { label: string; flag: string }
  > = {
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
    label:
      staticLabels[currency.code]?.label ??
      currency.meta.label,
    flag:
      staticLabels[currency.code]?.flag ??
      "💱",
  }));

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const value = searchTerm.trim();

    if (!value) return;

    navigate(`/products?search=${encodeURIComponent(value)}`);
    setSearchTerm("");
  };

  const handleLogout = async () => {
    await logout();

    setCustomer(null);
    setMenuOpen(false);

    navigate("/home");
  };

  return (
    <header
      dir="rtl"
      className="
      fixed inset-x-0 top-0 z-50
      border-b border-black/[0.04]
      bg-white
      "
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">

        {/* TOP ROW */}
        <div className="relative flex h-14 items-center justify-between md:h-16">

          {/* RIGHT */}
          <div className="flex items-center">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="فتح القائمة"
                  className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  text-black/70
                  hover:bg-[#FFF3F8]
                  hover:text-[#AC2471]
                  "
                >
                  <List size={22} />
                </button>
              </SheetTrigger>

              <SheetContent
                side="right"
                dir="rtl"
                className="
                flex h-full
                w-[86vw]
                max-w-[355px]
                flex-col
                border-l border-black/5
                bg-white
                p-0
                "
              >
                {/* MENU HEADER */}
                <div className="flex items-center justify-center border-b border-black/5 px-5 py-5">
                  <Link
                    to="/home"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center"
                  >
                    <img
                      src="/icons/flamingo.jpeg"
                      alt="فلامنجو"
                      width={60}
                      height={60}
                      loading="lazy"
                      className="h-[60px] w-[60px] object-contain"
                    />
                  </Link>
                </div>

                {/* MENU */}
                <nav className="flex-1 overflow-y-auto px-3 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/notifications");
                      }}
                      className="
                      mt-4 flex w-full
                      items-center gap-3
                      rounded-2xl
                      bg-[#FFF3F8]
                      px-4 py-3
                      text-right
                      "
                    >
                      <Bell size={19} className="text-[#AC2471]" />

                      <span className="flex-1 text-xs font-medium text-[#AC2471]">
                        لديك {unreadCount} إشعار جديد
                      </span>
                    </button>
                  )}

                  <Section label="التسوق">
                    <NavItem
                      to="/home"
                      icon={House}
                      label="الرئيسية"
                      onNavigate={() => setMenuOpen(false)}
                    />

                    <NavItem
                      to="/categories"
                      icon={SquaresFour}
                      label="الأقسام"
                      onNavigate={() => setMenuOpen(false)}
                    />

                    <NavItem
                      to="/products"
                      icon={Package}
                      label="جميع المنتجات"
                      onNavigate={() => setMenuOpen(false)}
                    />

                    <NavItem
                      to="/seasonal-offers"
                      icon={Tag}
                      label="العروض"
                      onNavigate={() => setMenuOpen(false)}
                    />

                    <NavItem
                      to="/new-arrivals"
                      icon={Package}
                      label="وصل حديثاً"
                      onNavigate={() => setMenuOpen(false)}
                    />

                    <NavItem
                      to="/best-sellers"
                      icon={Crown}
                      label="الأكثر مبيعاً"
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </Section>

                  <Section label="الحساب">
                    <NavItem
                      to="/cart"
                      icon={ShoppingCart}
                      label="السلة"
                      badge={cartCount || undefined}
                      onNavigate={() => setMenuOpen(false)}
                    />

                    <NavItem
                      to="/favorites"
                      icon={Heart}
                      label="المفضلة"
                      badge={favorites.length || undefined}
                      onNavigate={() => setMenuOpen(false)}
                    />

                    <NavItem
                      to="/account"
                      icon={User}
                      label="حسابي"
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </Section>

                  <Section label="المتجر">
                    <NavItem
                      to="/store-info"
                      icon={MapPin}
                      label="معلومات المتجر"
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </Section>
                </nav>

                {/* MENU FOOTER */}
                <div className="border-t border-black/5 p-4">
                  {customer ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="
                      flex h-11 w-full
                      items-center justify-center gap-2
                      rounded-xl
                      border border-black/10
                      bg-white
                      text-sm font-medium
                      text-black/70
                      hover:border-[#AC2471]/25
                      hover:text-[#AC2471]
                      "
                    >
                      <SignOut size={18} />
                      تسجيل الخروج
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/auth");
                      }}
                      className="
                      flex h-11 w-full
                      items-center justify-center gap-2
                      rounded-xl
                      bg-[#AC2471]
                      text-sm font-semibold
                      text-white
                      "
                    >
                      <SignIn size={18} />
                      تسجيل الدخول
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* LOGO */}
          <Link
            to="/home"
            aria-label="الرئيسية"
            className="
            absolute left-1/2
            -translate-x-1/2
            "
          >
            <img
              src="/icons/flamingo.jpeg"
              alt="فلامنجو"
              width={48}
              height={48}
              fetchPriority="high"
              className="h-12 w-12 object-contain"
            />
          </Link>

          {/* LEFT */}
          <div className="flex items-center gap-0.5">

            {/* CURRENCY */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="العملة"
                  className="
                  flex h-10 items-center gap-1
                  rounded-xl px-2
                  text-[11px] font-semibold
                  text-black/55
                  hover:bg-[#FFF3F8]
                  hover:text-[#AC2471]
                  "
                >
                  <Globe size={17} />
                  <span>{short}</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-60"
              >
                <DropdownMenuLabel className="text-xs">
                  اختر العملة
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {currencies.map((currency) => (
                  <DropdownMenuItem
                    key={currency.key}
                    onClick={() => setMode(currency.key)}
                    className="cursor-pointer justify-between"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span>{currency.flag}</span>
                      {currency.label}
                    </span>

                    {mode === currency.key && (
                      <span className="h-2 w-2 rounded-full bg-[#AC2471]" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CART */}
            <button
              type="button"
              onClick={openCart}
              aria-label="السلة"
              className="
              relative flex h-10 w-10
              items-center justify-center
              rounded-xl
              text-black/70
              hover:bg-[#FFF3F8]
              hover:text-[#AC2471]
              "
            >
              <ShoppingCart size={21} weight="regular" />

              {cartCount > 0 && (
                <span
                  className="
                  absolute -left-1 -top-0.5
                  flex h-[18px] min-w-[18px]
                  items-center justify-center
                  rounded-full
                  bg-[#AC2471]
                  px-1
                  text-[10px] font-bold
                  text-white
                  "
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div
          className={`
          overflow-hidden
          ${
            compact
              ? "max-h-0 opacity-0"
              : "max-h-16 opacity-100"
          }
          transition-[max-height,opacity]
          duration-150
          `}
        >
          <form onSubmit={submitSearch} className="pb-3">
            <label className="relative block">
              <MagnifyingGlass
                size={18}
                className="
                pointer-events-none
                absolute right-4 top-1/2
                -translate-y-1/2
                text-black/30
                "
              />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن منتج، ماركة أو قسم..."
                enterKeyHint="search"
                autoComplete="off"
                className="
                h-11 w-full
                rounded-2xl
                border border-black/[0.05]
                bg-[#FAFAFA]
                pr-11 pl-4
                text-[13px]
                text-black
                placeholder:text-black/30
                outline-none
                focus:border-[#AC2471]/20
                focus:bg-white
                "
              />
            </label>
          </form>
        </div>
      </div>
    </header>
  );
};

export default Navbar;