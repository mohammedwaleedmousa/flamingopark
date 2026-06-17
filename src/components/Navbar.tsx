import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Menu, X, Heart } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import Logo from "@/components/Logo";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { openCart, getCartCount } = useStore();
  const { favorites } = useFavorites();
  const cartCount = getCartCount();
  const navigate = useNavigate();

  const navLinks = [
    { href: "/home", label: "الرئيسية" },
    { href: "/products", label: "المنتجات" },
    { href: "/products?category=clothing", label: "ملابس" },
    { href: "/products?category=footwear", label: "أحذية" },
    { href: "/products?category=accessories", label: "إكسسوارات" },
    { href: "/products?category=watches", label: "ساعات" },
    { href: "/products?category=bags", label: "حقائب" },
    { href: "/offers", label: "العروض" },
    { href: "/about", label: "من نحن" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-background/95 backdrop-blur-0 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 text-foreground hover:text-primary transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2.5 text-foreground hover:text-primary transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            <Link
              to="/home"
              className="absolute left-1/2 -translate-x-1/2 logo-flamingo text-2xl md:text-3xl text-primary"
              aria-label="Flamingo home"
            >
              Flamingo
            </Link>

            <div className="flex items-center gap-1">
              <Link
                to="/favorites"
                className="relative p-2.5 text-foreground hover:text-primary transition-colors"
                aria-label="Favorites"
              >
                <Heart className="w-5 h-5" />
                {favorites.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                    {favorites.length}
                  </span>
                )}
              </Link>
              <button
                onClick={openCart}
                className="relative p-2.5 text-foreground hover:text-primary transition-colors"
                aria-label="Shopping cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="overflow-hidden bg-background border-b border-border animate-fade-in">
          <div className="container mx-auto px-4 py-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
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
                className="w-full pr-10 pl-4 py-2.5 bg-muted/40 border border-border rounded-xl font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                dir="rtl"
              />
            </div>
          </div>
        </div>
      )}

      {isMenuOpen && (
        <div className="overflow-hidden bg-background border-b border-border shadow-elegant animate-fade-in">
          <nav className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-3 text-right font-body text-foreground hover:text-primary hover:bg-muted rounded-xl transition-all"
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
                  تسجيل خروج
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
