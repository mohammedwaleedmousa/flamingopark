import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Menu, Heart, User, X, LogOut, Home, Tag, Sparkles, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

const Navbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<SupaUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCart, getCartCount } = useStore();
  const { favorites } = useFavorites();
  const cartCount = getCartCount();
  const navigate = useNavigate();

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
                  <div className="px-6 pt-8 pb-6 border-b border-border bg-foreground text-background">
                    <p className="logo-flamingo text-2xl mb-1">FLAMINGO</p>
                    <p className="text-[10px] tracking-[0.4em] uppercase opacity-70">Maison de Luxe</p>
                    {user ? (
                      <div className="mt-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium truncate max-w-[200px]">{user.email}</p>
                          <button onClick={handleLogout} className="text-[11px] underline opacity-70">تسجيل الخروج</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setMenuOpen(false); navigate("/auth"); }}
                        className="mt-6 w-full bg-background text-foreground py-3 text-[11px] tracking-[0.35em] uppercase"
                      >
                        تسجيل الدخول
                      </button>
                    )}
                  </div>

                  <nav className="flex-1 overflow-y-auto px-6 py-6">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-4">التنقل</p>
                    <ul className="space-y-1 mb-8">
                      {[
                        { href: "/home", label: "الرئيسية", icon: Home },
                        { href: "/products", label: "كل المنتجات", icon: Tag },
                        { href: "/offers", label: "العروض", icon: Sparkles },
                        { href: "/favorites", label: "المفضلة", icon: Heart },
                        { href: "/about", label: "عن الدار", icon: Info },
                      ].map((l) => (
                        <li key={l.href}>
                          <Link to={l.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 text-foreground hover:text-foreground/60 transition">
                            <l.icon className="w-4 h-4" />
                            <span className="text-base">{l.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-4">الأقسام</p>
                    <ul className="space-y-1">
                      {topLinks.map((l) => (
                        <li key={l.href}>
                          <Link to={l.href} onClick={() => setMenuOpen(false)} className="block py-2.5 font-heading text-lg hover:opacity-60 transition">
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>

                  {user && (
                    <button onClick={handleLogout} className="border-t border-border p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
                      <LogOut className="w-4 h-4" /> تسجيل الخروج
                    </button>
                  )}
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
