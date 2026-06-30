import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, ShoppingBag, User, Heart } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const cartCount = useStore((s) => s.getCartCount());
  const { favorites } = useFavorites();

  // Hide on admin and auth
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth") || pathname.startsWith("/signin") || pathname.startsWith("/signup")) {
    return null;
  }

  const items = [
    { to: "/home", icon: Home, label: "الرئيسية", match: ["/home", "/", "/index"] },
    { to: "/categories", icon: LayoutGrid, label: "الأقسام", match: ["/categories", "/products"] },
    { to: "/favorites", icon: Heart, label: "المفضلة", match: ["/favorites"], badge: favorites.length },
    { to: "/cart", icon: ShoppingBag, label: "السلة", match: ["/cart", "/checkout"], badge: cartCount },
    { to: "/account", icon: User, label: "حسابي", match: ["/account"] },
  ];

  const isActive = (m: string[]) => m.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <nav
      dir="rtl"
      className="md:hidden fixed bottom-3 inset-x-3 z-50 glass-panel rounded-3xl px-2 py-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="grid grid-cols-5 gap-1">
        {items.map((it) => {
          const active = isActive(it.match);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition-all ${
                  active ? "text-white" : "text-foreground/70 hover:text-primary"
                }`}
                style={active ? { background: "var(--gradient-primary)" } : undefined}
              >
                <div className="relative">
                  <Icon className="w-[20px] h-[20px]" />
                  {!!it.badge && it.badge > 0 && (
                    <span className="absolute -top-1.5 -left-2 min-w-[16px] h-[16px] px-1 rounded-full bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center">
                      {it.badge > 9 ? "9+" : it.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-none mt-0.5">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;