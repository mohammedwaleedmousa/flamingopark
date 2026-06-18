import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Menu, X, Heart, User } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { openCart, getCartCount } = useStore();
  const { favorites } = useFavorites();
  const cartCount = getCartCount();
  const navigate = useNavigate();

  const topLinks = [
    { href: "/products?category=women", label: "Women" },
    { href: "/products?category=men", label: "Men" },
    { href: "/products?category=kids", label: "Kids" },
    { href: "/products?category=beauty", label: "Beauty" },
    { href: "/products?category=sports", label: "Sports" },
  ];

  const menuLinks = [
    { href: "/home", label: "الرئيسية" },
    { href: "/products", label: "كل المنتجات" },
    { href: "/products?category=women", label: "Women" },
    { href: "/products?category=men", label: "Men" },
    { href: "/products?category=kids", label: "Kids" },
    { href: "/products?category=beauty", label: "Beauty" },
    { href: "/products?category=sports", label: "Sports" },
    { href: "/offers", label: "العروض" },
    { href: "/about", label: "Maison" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-8">
          <div className="relative flex items-center justify-between h-16 md:h-20">
            {/* LEFT: menu + search */}
            <div className="flex items-center gap-2 z-10">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-foreground hover:opacity-60 transition-opacity"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-foreground hover:opacity-60 transition-opacity hidden md:inline-flex"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* CENTER: wordmark */}
            <Link
              to="/home"
              className="absolute left-1/2 -translate-x-1/2 logo-flamingo text-xl md:text-2xl"
              aria-label="Flamingo home"
            >
              FLAMINGO
            </Link>

            {/* RIGHT: account + wishlist + bag */}
            <div className="flex items-center gap-1 z-10">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-foreground hover:opacity-60 transition-opacity md:hidden"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              <Link
                to="/account"
                className="p-2 text-foreground hover:opacity-60 transition-opacity hidden md:inline-flex"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </Link>
              <Link
                to="/favorites"
                className="relative p-2 text-foreground hover:opacity-60 transition-opacity"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {favorites.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 text-[10px] font-medium flex items-center justify-center bg-foreground text-background">
                    {favorites.length}
                  </span>
                )}
              </Link>
              <button
                onClick={openCart}
                className="relative p-2 text-foreground hover:opacity-60 transition-opacity"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 text-[10px] font-medium flex items-center justify-center bg-foreground text-background">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sub-nav: editorial categories */}
          <nav className="hidden md:flex items-center justify-center gap-10 h-10 border-t border-border/60">
            {topLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="text-[11px] tracking-[0.32em] uppercase text-foreground/80 hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {isSearchOpen && (
        <div className="overflow-hidden bg-background border-b border-border animate-fade-in">
          <div className="container mx-auto px-4 py-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث في فلامنجو..."
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchTerm.trim()) {
                    navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
                    setIsSearchOpen(false);
                    setSearchTerm("");
                  }
                }}
                className="w-full pr-10 pl-4 py-3 bg-transparent border-b border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                dir="rtl"
              />
            </div>
          </div>
        </div>
      )}

      {isMenuOpen && (
        <div className="overflow-hidden bg-background border-b border-border animate-fade-in">
          <nav className="container mx-auto px-4 py-8">
            <div className="flex flex-col gap-1 max-w-md">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-2 py-3 text-right font-heading text-2xl text-foreground hover:opacity-60 transition-opacity"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
