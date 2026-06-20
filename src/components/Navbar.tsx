import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Menu, Heart, User, X, LogOut, Home, Tag, Sparkles, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<SupaUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCart, getCartCount } = useStore();
  const { favorites } = useFavorites();
  const cartCount = getCartCount();
  const navigate = useNavigate();
  const [stack, setStack] = useState<string[]>(["main"]);
  const currentPage = stack[stack.length - 1];
  const goTo = (page: string) => setStack((s) => [...s, page]);
  const goBack = () => setStack((s) => s.slice(0, -1));
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const topLinks = [
    { href: "/products?category=women", label: "نسائي" },
    { href: "/products?category=men", label: "رجالي" },
    { href: "/products?category=kids", label: "أطفال" },
    { href: "/products?category=bags", label: "حقائب" },
    { href: "/products?category=shoes", label: "أحذية" },
    { href: "/products?category=beauty", label: "تجميل" },
    { href: "/offers", label: "العروض" },
  ];
  const menuTree = {
      main: [
        { label: "الأقسام", go: "categories" },
        { label: "العروض", href: "/offers" },
        { label: "كل المنتجات", href: "/products" },
        { label: "وصل حديثاً", href: "/products?sort=new" },
        { label: "الأكثر مبيعاً", href: "/products?sort=popular" },
        { label: "المفضلة", href: "/favorites" },
        { label: "سلة التسوق", href: "/cart" },
        { label: "عن الدار", href: "/about" },
      ],

      categories: [
        { label: "رجالي", go: "men" },
        { label: "نسائي", go: "women" },
        { label: "أطفال", href: "/products?category=kids" },
        { label: "حقائب", href: "/products?category=bags" },
        { label: "أحذية", href: "/products?category=shoes" },
        { label: "تجميل", href: "/products?category=beauty" },
        { label: "عطور", href: "/products?category=perfume" },
      ],

      men: [
        { label: "قمصان", href: "/products?category=men&t=shirts" },
        { label: "بناطيل", href: "/products?category=men&t=pants" },
        { label: "جواكت", href: "/products?category=men&t=jackets" },
        { label: "أحذية", href: "/products?category=men&t=shoes" },
        { label: "ملابس رياضية", href: "/products?category=men&t=sport" },
      ],

      women: [
        { label: "فساتين", href: "/products?category=women&t=dresses" },
        { label: "عبايات", href: "/products?category=women&t=abayas" },
        { label: "حقائب", href: "/products?category=women&t=bags" },
        { label: "أحذية", href: "/products?category=women&t=shoes" },
        { label: "عطور", href: "/products?category=women&t=perfume" },
        { label: "مكياج", href: "/products?category=women&t=makeup" },
      ],
    };
  const pageItems = menuTree[currentPage as keyof typeof menuTree] || [];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    toast({ title: "تم تسجيل الخروج" });
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-b border-border" dir="rtl">
      <div className="container mx-auto px-4 md:px-8">
        <div className="relative flex items-center justify-between h-16 md:h-20">
          {/* Right (in RTL): menu + search */}
          <div className="flex items-center gap-1 z-10">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-2 hover:opacity-60 transition" aria-label="القائمة">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[380px] p-0 bg-background" dir="rtl">
                <div className="flex flex-col h-full">
                  <div className="px-6 pt-6 pb-5 border-b border-border bg-background">

                  {/* title */}
                  <div className="mb-4">
                    <p className="text-lg font-semibold text-foreground">فلامنغو</p>
                    <p className="text-xs text-muted-foreground">الحساب والإعدادات</p>
                  </div>

                  {/* card */}
                  {user ? (
                    <div className="rounded-2xl border border-border bg-muted/40 overflow-hidden">

                      <div className="flex items-center gap-3 p-4">

                        <div className="w-11 h-11 rounded-full bg-background flex items-center justify-center border">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.email}
                          </p>

                          <button
                            onClick={handleLogout}
                            className="text-xs text-red-500 mt-1 hover:opacity-70"
                          >
                            تسجيل الخروج
                          </button>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/auth");
                      }}
                      className="w-full py-3 rounded-2xl bg-foreground text-background text-sm font-medium"
                    >
                      تسجيل الدخول
                    </button>
                  )}

                </div>

                  <nav className="flex-1 overflow-hidden relative px-6 py-6">
  <AnimatePresence mode="popLayout">
    <motion.div
      key={currentPage}
      initial={{ x: 40, opacity: 0, scale: 0.98 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: -40, opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 px-6 py-2 flex flex-col"
    >

      {/* BACK BUTTON */}
      {currentPage !== "main" && (
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm mb-5 text-muted-foreground hover:text-foreground transition"
        >
          ← رجوع
        </button>
      )}

      {/* MAIN */}
      {currentPage === "main" && (
        <div className="space-y-2">

          {pageItems.map((item, i) =>
            item.go ? (
              <button
                key={i}
                onClick={() => goTo(item.go)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">›</span>
              </button>
            ) : (
              <Link
                key={i}
                to={item.href!}
                onClick={() => setMenuOpen(false)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">↗</span>
              </Link>
            )
          )}

        </div>
      )}

      {/* CATEGORIES */}
      {currentPage === "categories" && (
        <div className="space-y-2">

          {pageItems.map((item, i) =>
            item.go ? (
              <button
                key={i}
                onClick={() => goTo(item.go)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">›</span>
              </button>
            ) : (
              <Link
                key={i}
                to={item.href!}
                onClick={() => setMenuOpen(false)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">↗</span>
              </Link>
            )
          )}

        </div>
      )}

      {/* MEN */}
      {currentPage === "men" && (
        <div className="space-y-2">

          {pageItems.map((item, i) =>
            item.go ? (
              <button
                key={i}
                onClick={() => goTo(item.go)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">›</span>
              </button>
            ) : (
              <Link
                key={i}
                to={item.href!}
                onClick={() => setMenuOpen(false)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">↗</span>
              </Link>
            )
          )}

        </div>
      )}

      {/* WOMEN */}
      {currentPage === "women" && (
        <div className="space-y-2">

          {pageItems.map((item, i) =>
            item.go ? (
              <button
                key={i}
                onClick={() => goTo(item.go)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">›</span>
              </button>
            ) : (
              <Link
                key={i}
                to={item.href!}
                onClick={() => setMenuOpen(false)}
                className="w-full flex justify-between items-center
                           px-4 py-3 rounded-2xl
                           bg-muted/40 hover:bg-muted
                           transition active:scale-[0.98]
                           shadow-sm"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground">↗</span>
              </Link>
            )
          )}

        </div>
      )}

    </motion.div>
  </AnimatePresence>
</nav>
                </div>
              </SheetContent>
            </Sheet>
            <button onClick={() => setIsSearchOpen((v) => !v)} className="p-2 hover:opacity-60 transition" aria-label="بحث">
              {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* Center wordmark */}
          <Link to="/home" className="absolute left-1/2 -translate-x-1/2 logo-flamingo text-xl md:text-2xl">
            FLAMINGO
          </Link>

          {/* Left (RTL): account, wishlist, bag */}
          <div className="flex items-center gap-1 z-10">
            <Link to={user ? "/favorites" : "/auth"} className="p-2 hover:opacity-60 transition hidden md:inline-flex" aria-label="حساب">
              <User className="w-5 h-5" />
            </Link>
            <Link to="/favorites" className="relative p-2 hover:opacity-60 transition" aria-label="مفضلة">
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute top-1 left-1 min-w-[16px] h-4 px-1 text-[10px] flex items-center justify-center bg-foreground text-background">{favorites.length}</span>
              )}
            </Link>
            <button onClick={openCart} className="relative p-2 hover:opacity-60 transition" aria-label="سلة">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 left-1 min-w-[16px] h-4 px-1 text-[10px] flex items-center justify-center bg-foreground text-background">{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Sub-nav */}
        <nav className="hidden md:flex items-center justify-center gap-8 h-10 border-t border-border/60 overflow-x-auto hide-scrollbar">
          {topLinks.map((l) => (
            <Link key={l.href} to={l.href} className="text-[11px] tracking-[0.32em] uppercase text-foreground/75 hover:text-foreground transition whitespace-nowrap">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {isSearchOpen && (
        <div className="border-b border-border bg-background animate-fade-in">
          <form onSubmit={submit} className="container mx-auto px-4 py-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن منتج، ماركة، قسم..."
                className="w-full pr-10 pl-4 py-3 bg-transparent border-b border-border text-sm focus:outline-none focus:border-foreground"
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
