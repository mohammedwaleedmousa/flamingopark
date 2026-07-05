import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User, Heart, ShoppingBag, LogOut, Package, Mail, ChevronLeft } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import LoadingScreen from "@/components/LoadingScreen";

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { favorites } = useFavorites();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth", { replace: true });
      else setUser(data.user);
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "تم تسجيل الخروج" });
    navigate("/home");
  };

  if (loading) return <LoadingScreen />;

  const items = [
    { to: "/favorites", icon: Heart, label: "المفضلة", desc: `${favorites.length} منتج` },
    { to: "/cart", icon: ShoppingBag, label: "حقيبتي", desc: "عرض السلة الحالية" },
    { to: "/products", icon: Package, label: "طلباتي", desc: "سجل المشتريات" },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto bg-foreground text-background rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8" />
            </div>
            <h1 className="font-heading text-3xl">{user?.user_metadata?.full_name || "أهلاً بك"}</h1>
            <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" /> {user?.email}
            </p>
          </div>

          <div className="space-y-2">
            {items.map((it) => (
              <Link key={it.to} to={it.to} className="flex items-center gap-4 p-5 border border-border hover:border-foreground transition group">
                <it.icon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-heading text-base">{it.label}</p>
                  <p className="text-xs text-muted-foreground">{it.desc}</p>
                </div>
                <ChevronLeft className="w-4 h-4 opacity-50 group-hover:opacity-100" />
              </Link>
            ))}

            <button onClick={handleLogout} className="w-full flex items-center gap-4 p-5 border border-border hover:border-destructive hover:text-destructive transition mt-6">
              <LogOut className="w-5 h-5" />
              <span className="font-heading text-base">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountPage;