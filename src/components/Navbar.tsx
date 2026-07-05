import {
  ShoppingCart,
  MagnifyingGlass,
  List,
  X,
  House,
  Tag,
  TrendUp,
  Crown,
  Heart,
  User,
  CaretLeft,
  SquaresFour,
} from "phosphor-react";
import { Globe } from "phosphor-react";
import { SignOut } from "phosphor-react";
import { SignIn } from "phosphor-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useCurrency } from "@/lib/currency";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="pt-5 pb-1">
    <div className="flex items-center gap-3 px-6 mb-2">
      <span className="h-px flex-1 bg-border" />
      <p className="text-[10px] tracking-[0.45em] uppercase text-muted-foreground font-medium">{label}</p>
      <span className="h-px w-6 bg-border" />
    </div>
    <div>{children}</div>
  </div>
);


const NavItem = ({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: any;
  label: string;
  badge?: number | string;
}) => (
  <NavLink to={to} end={to === "/home"}>
    {({ isActive }) => (
      <div
        className={`
          group relative w-full flex items-center gap-3
          px-4 py-3 rounded-xl transition-all duration-300

          ${
            isActive
              ? "bg-white text-black shadow-[0_10px_30px_-12px_rgba(0,0,0,.18)] ring-1 ring-black/5"
              : "text-black/80 hover:bg-white hover:text-black hover:shadow-[0_12px_35px_-15px_rgba(0,0,0,.18)]"
          }
        `}
      >
        {isActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-pink-500" />
        )}

        <span
  className={`
    w-9 h-9 rounded-xl
    flex items-center justify-center
    transition-all duration-300
    ${isActive
      ? "bg-pink-50 text-pink-500"
      : "bg-gray-50 text-black/60 group-hover:bg-pink-50 group-hover:text-pink-600"
    }
  `}
>
  <Icon size={18} weight="regular" className="w-[18px] h-[18px]" />
</span>

        <span className="flex-1 text-[13px] font-medium text-right">
          {label}
        </span>

        {badge !== undefined && badge !== 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}

        <CaretLeft
          className={`w-4 h-4 transition-all duration-300 ${
            isActive
              ? "text-pink-500"
              : "text-black/30 group-hover:text-pink-500 group-hover:-translate-x-1"
          }`}
        />
      </div>
    )}
  </NavLink>
);



const Navbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sideSearch, setSideSearch] = useState("");
  const [user, setUser] = useState<SupaUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCart, getCartCount } = useStore();
  const { favorites } = useFavorites();
  const cartCount = getCartCount();
  const navigate = useNavigate();
  const { logout } = useAuthActions();
  const { mode, setMode, short, label } = useCurrency();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const currencies: { key: typeof mode; label: string; flag: string }[] = [
    { key: "SAR",       label: "ريال سعودي",              flag: "🇸🇦" },
    { key: "YER_SOUTH", label: "ريال يمني — محافظات جنوبية", flag: "🇾🇪" },
    { key: "YER_NORTH", label: "ريال يمني — محافظات شمالية", flag: "🇾🇪" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["nav-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return (data || []) as any[];
    },
  });

  const parents = categories.filter((c) => !c.parent_id);
  const subsOf = (id: string) => categories.filter((c) => c.parent_id === id);

  const topLinks = parents.slice(0, 6).map((c) => ({ href: `/products?category=${c.slug}`, label: c.name_ar }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  const handleLogout = async () => {
    await logout({
      redirectTo: "/home",
      onSuccess: () => {
        setUser(null);
        setMenuOpen(false);
      },
    });
  };

  const goTo = (href: string) => { setMenuOpen(false); navigate(href); };

  const sideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sideSearch.trim()) return;
    goTo(`/products?search=${encodeURIComponent(sideSearch.trim())}`);
    setSideSearch("");
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white backdrop-blur-xl border-b border-black/5 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.2)]" dir="rtl">      
      <div className="container mx-auto px-4 md:px-8">
        <div className="relative flex items-center justify-between h-16 md:h-20">
          {/* Right (in RTL): menu + search */}
          <div className="flex items-center gap-1 z-10">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  onClick={() => setMenuOpen(true)}
                  className="
                    p-2 rounded-xl
                    hover:bg-pink-50
                    transition group
                  "
                  aria-label="القائمة"
                >
                  <List size={20} weight="regular" className="text-black/80 group-hover:text-black transition" />               
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="
                w-[80vw] sm:w-[360px] p-0
                bg-white backdrop-blur-xl
                border-l border-black/5
                shadow-[20px_0_60px_-30px_rgba(0,0,0,0.25)]
                [&>button]:left-3
                [&>button]:right-auto
                flex flex-col h-full
              "
                dir="rtl"
              >
                <div className="flex flex-col h-full p-3">
                  {/* Hero header */}
                  <div className="w-full flex justify-center items-center py-4">
                    <img
                      src="/icons/flamingo.jpeg"
                      alt="logo"
                      className="w-20 h-20 object-contain transition-all duration-500 ease-in-out hover:scale-105"
                    />
                  </div>

                  <nav className="flex-1 overflow-y-auto pb-4 flex flex-col [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {/* Shopping */}
                    <Section label="التسوق">
                      <NavItem to="/home" icon={House} label="الرئيسية" />
                      <NavItem to="/categories" icon={SquaresFour} label="جميع الأقسام" />
                      <NavItem to="/products" icon={Tag} label="جميع المنتجات" />
                      <NavItem to="/search" icon={MagnifyingGlass} label="بحث متقدم" />
                      <NavItem to="/comparison" icon={SquaresFour} label="مقارنة المنتجات" />
                      <NavItem to="/seasonal-offers" icon={TrendUp} label="العروض الموسمية" />
                      <NavItem to="/new-arrivals" icon={TrendUp} label="وصل حديثاً" />
                      <NavItem to="/best-sellers" icon={Crown} label="الأكثر مبيعاً" />
                      
                    </Section>

                    <Section label="الحساب">
                      <NavItem to="/cart" icon={ShoppingCart} label="الحقيبة" badge={cartCount || undefined} />
                      <NavItem to="/favorites" icon={Heart} label="المفضلة" badge={favorites.length || undefined} />
                      <NavItem to="/account" icon={User} label="حسابي" />
                    </Section>
                  </nav>
                <div className="border-t border-border px-6 py-5 bg-white">
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="
                        w-full flex items-center justify-center gap-2
                        py-3

                        text-[12px]
                        tracking-[0.35em]
                        uppercase
                        font-medium

                        text-black
                        border border-black/10
                        bg-transparent

                        transition-all duration-300 ease-out
                        relative overflow-hidden

                        hover:text-pink-600
                        hover:border-pink-300
                        hover:tracking-[0.45em]

                        active:scale-[0.98]
                      "
                    >
                      <SignOut size={18} weight="bold" />
                      <span className="relative z-10">تسجيل الخروج</span>
                      <span className="group absolute bottom-0 left-0 w-0 h-[1px] bg-pink-500 transition-all duration-300 group-hover:w-full" />
                    </button>
                  ) : (
                    <button
                      onClick={() => goTo("/auth")}
                      className="
                        w-full flex items-center justify-center gap-2
                        py-3

                        text-[12px]
                        tracking-[0.35em]
                        uppercase
                        font-medium

                        text-black
                        border border-black/10
                        bg-transparent

                        transition-all duration-300 ease-out
                        relative overflow-hidden

                        hover:text-pink-600
                        hover:border-pink-300
                        hover:tracking-[0.45em]

                        active:scale-[0.98]
                      "
                    >
                      <SignIn size={18} weight="bold" />
                      <span className="relative z-10">تسجيل الدخول</span>
                      <span className="group absolute bottom-0 left-0 w-0 h-[1px] bg-pink-500 transition-all duration-300 group-hover:w-full" />
                    </button>
                  )}
                </div>
                </div>
              </SheetContent>
              
            </Sheet>
            <button
              onClick={() => setIsSearchOpen((v) => !v)}
              className="
                p-2 rounded-xl
                hover:bg-pink-50
                transition group
              "
              aria-label="بحث"
            >
              {isSearchOpen ? (
                <X className="w-5 h-5 text-pink-500 transition" />
              ) : (
                <MagnifyingGlass size={20} weight="regular" className="text-black/80 group-hover:text-pink-500 transition" />
              )}
            </button>
          </div>

          {/* Center wordmark */}
          <Link
            to="/home"
            className="
              absolute left-1/2 -translate-x-1/2
              text-[14px] md:text-xl
              font-semibold tracking-[0.4em]
              uppercase
              text-black/80
            "
          >
            <span className="text-pink-500">FLAMINGO</span>
          </Link>

          {/* Left (RTL): account, wishlist, bag */}
          <div className="flex items-center z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="
                    flex items-center gap-2 px-2.5 py-2 rounded-xl
                    text-xs font-medium
                    text-black hover:text-pink-500
                    hover:bg-pink-50 transition
                  "
                >
                  <Globe size={18} weight="regular" />
                  <span>{short}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64" style={{ direction: "rtl" }}>
                <DropdownMenuLabel className="text-xs">اختر العملة</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currencies.map((c) => (
                  <DropdownMenuItem key={c.key} onClick={() => setMode(c.key)} className="justify-between gap-20 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm">
                      <span>{c.flag}</span>{c.label}
                    </span>
                    {mode === c.key && <span className="text-[10px] text-primary">●</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={openCart}
              className="
                relative p-2 rounded-xl
                hover:bg-pink-50
                transition group
              "
              aria-label="السلة"
            >
              <ShoppingCart size={20} weight="fill" className="text-black/80" />

              {cartCount > 0 && (
                <span className="
                  absolute -top-1 -left-1
                  min-w-[18px] h-[18px]
                  px-1.5
                  rounded-full
                  bg-gradient-to-br from-pink-400 to-rose-500
                  text-white text-[10px] font-bold
                  flex items-center justify-center
                  shadow-md
                ">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

      </div>

      {isSearchOpen && (
        <div className="border-b bg-white/90 backdrop-blur-xl animate-in fade-in duration-200">
          <form onSubmit={submit} className="container mx-auto px-4 py-4">
            <div className="relative">

              <MagnifyingGlass size={22} weight="bold" className="text-black/70 group-hover:text-pink-500 transition" />

              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن منتج، ماركة، قسم..."
                className="
                  w-full pr-10 pl-4 py-3
                  bg-white
                  border border-pink-100
                  rounded-xl
                  text-sm
                  focus:outline-none
                  focus:ring-2 focus:ring-pink-200
                  transition
                "
                dir="rtl"
              />

            </div>
          </form>
        </div>
      )}
    </header>
  );
};

export default Navbar;
