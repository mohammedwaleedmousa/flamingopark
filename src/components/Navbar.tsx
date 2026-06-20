import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag, Search, Menu, Heart, User, X, LogOut, Home, Tag, Sparkles, Info,
  ChevronDown, Grid3x3, TrendingUp, Star, Package, HelpCircle, Phone, MessageCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
    await supabase.auth.signOut();
    setMenuOpen(false);
    toast({ title: "تم تسجيل الخروج" });
  };

  const goTo = (href: string) => { setMenuOpen(false); navigate(href); };

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
              <SheetContent side="right" className="w-[88vw] sm:w-[400px] p-0 bg-background border-l" dir="rtl">
                <div className="flex flex-col h-full">
                  {/* User header */}
                  <div className="px-6 pt-10 pb-6 bg-gradient-to-b from-foreground to-foreground/95 text-background">
                    <p className="logo-flamingo text-2xl mb-1">FLAMINGO</p>
                    <p className="text-[10px] tracking-[0.4em] uppercase opacity-60">Maison de Luxe</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-background/10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="text-sm flex-1 min-w-0">
                        {user ? (
                          <>
                            <p className="font-medium truncate">{user.user_metadata?.full_name || user.email}</p>
                            <button onClick={() => goTo("/account")} className="text-[11px] underline opacity-70">حسابي</button>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">مرحباً بك</p>
                            <button onClick={() => goTo("/auth")} className="text-[11px] underline opacity-70">تسجيل الدخول / إنشاء حساب</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <nav className="flex-1 overflow-y-auto">
                    {/* Shopping */}
                    <Section label="التسوق">
                      <NavItem to="/home" icon={Home} label="الرئيسية" onClick={() => goTo("/home")} />
                      <NavItem to="/categories" icon={Grid3x3} label="جميع الأقسام" onClick={() => goTo("/categories")} />
                      <NavItem to="/products" icon={Tag} label="جميع المنتجات" onClick={() => goTo("/products")} />
                      <NavItem to="/new-arrivals" icon={Sparkles} label="وصل حديثاً" onClick={() => goTo("/new-arrivals")} />
                      <NavItem to="/best-sellers" icon={TrendingUp} label="الأكثر مبيعاً" onClick={() => goTo("/best-sellers")} />
                      <NavItem to="/offers" icon={Star} label="العروض" onClick={() => goTo("/offers")} />
                    </Section>

                    {/* Categories (multi-level) */}
                    <Section label="الأقسام">
                      {parents.map((c) => {
                        const subs = subsOf(c.id);
                        if (subs.length === 0) {
                          return (
                            <button
                              key={c.id}
                              onClick={() => goTo(`/products?category=${c.slug}`)}
                              className="w-full flex items-center justify-between px-6 py-3.5 text-right hover:bg-muted transition"
                            >
                              <span className="font-heading text-base">{c.name_ar}</span>
                              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">{c.name}</span>
                            </button>
                          );
                        }
                        return (
                          <Collapsible key={c.id}>
                            <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-muted transition group">
                              <span className="font-heading text-base">{c.name_ar}</span>
                              <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="bg-muted/40">
                              <button onClick={() => goTo(`/products?category=${c.slug}`)} className="w-full text-right px-10 py-2.5 text-sm text-muted-foreground hover:text-foreground transition">
                                — عرض الكل
                              </button>
                              {subs.map((s) => (
                                <button key={s.id} onClick={() => goTo(`/products?category=${s.slug}`)} className="w-full text-right px-10 py-2.5 text-sm hover:text-foreground/60 transition">
                                  {s.name_ar}
                                </button>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </Section>

                    {/* Account */}
                    <Section label="حسابي">
                      <NavItem to="/account" icon={User} label="حسابي" onClick={() => goTo("/account")} />
                      <NavItem to="/favorites" icon={Heart} label={`المفضلة${favorites.length ? ` (${favorites.length})` : ""}`} onClick={() => goTo("/favorites")} />
                      <NavItem to="/cart" icon={ShoppingBag} label={`الحقيبة${cartCount ? ` (${cartCount})` : ""}`} onClick={() => goTo("/cart")} />
                    </Section>

                    {/* Help */}
                    <Section label="المساعدة">
                      <NavItem to="/about" icon={Info} label="عن الدار" onClick={() => goTo("/about")} />
                      <NavItem to="/reviews" icon={MessageCircle} label="آراء العملاء" onClick={() => goTo("/reviews")} />
                    </Section>
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
            <Link to={user ? "/account" : "/auth"} className="p-2 hover:opacity-60 transition hidden md:inline-flex" aria-label="حساب">
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
