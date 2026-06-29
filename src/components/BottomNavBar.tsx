import { NavLink, useLocation } from "react-router-dom";
import { Home, Grid3x3, Heart, ShoppingBag, User } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";

/**
 * Mobile-only bottom tab bar. Five tabs, RTL order:
 * (right→left visually) الرئيسية · الأقسام · المفضلة · السلة · الحساب
 */
const items = [
  { to: "/home", label: "الرئيسية", icon: Home },
  { to: "/categories", label: "الأقسام", icon: Grid3x3 },
  { to: "/favorites", label: "المفضلة", icon: Heart },
  { to: "/cart", label: "السلة", icon: ShoppingBag },
  { to: "/account", label: "الحساب", icon: User },
];

const BottomNavBar = () => {
  const { getCartCount } = useStore();
  const { favorites } = useFavorites();
  const { pathname } = useLocation();
  const cartCount = getCartCount();
  const favCount = favorites.length;

  // Hide on admin & auth screens
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth") || pathname === "/signin" || pathname === "/signup") {
    return null;
  }

  return (
    <>
      {/* Spacer so content isn't covered */}
      <div aria-hidden className="md:hidden h-20" />
      <nav
        dir="rtl"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border/70 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.10)] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-16">
          {items.map((it) => {
            const Icon = it.icon;
            const badge = it.to === "/cart" ? cartCount : it.to === "/favorites" ? favCount : 0;
            return (
              <li key={it.to} className="flex">
                <NavLink
                  to={it.to}
                  className={({ isActive }) =>
                    `flex-1 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative">
                        <Icon
                          className="w-[22px] h-[22px]"
                          strokeWidth={isActive ? 2.4 : 1.8}
                          fill={isActive && it.to === "/favorites" ? "currentColor" : "none"}
                        />
                        {badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 text-[9px] rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold ring-2 ring-white">
                            {badge}
                          </span>
                        )}
                      </span>
                      <span className={isActive ? "font-semibold" : ""}>{it.label}</span>
                      {isActive && <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default BottomNavBar;