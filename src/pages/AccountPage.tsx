import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { User, Heart, ShoppingBag, LogOut, Package, Mail, ChevronLeft, Settings, Truck } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuthActions } from "@/hooks/useAuthActions";

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { favorites } = useFavorites();
  const { logout } = useAuthActions();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth", { replace: true });
      else setUser(data.user);
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await logout({ redirectTo: "/home" });
  };

  if (loading) return <LoadingScreen />;

  const mainItems = [
    { to: "/favorites", icon: Heart, label: "المفضلة", desc: `${favorites.length} منتج`, color: "text-primary" },
    { to: "/cart", icon: ShoppingBag, label: "حقيبتي", desc: "عرض السلة الحالية", color: "text-blue-500" },
    { to: "/products", icon: Package, label: "طلباتي", desc: "سجل المشتريات", color: "text-green-500" },
  ];

  const settingsItems = [
    { to: "/account", icon: Settings, label: "الإعدادات", desc: "تحديث بياناتك الشخصية", color: "text-amber-500" },
    { to: "/cart", icon: Truck, label: "شحناتي", desc: "تتبع الطلبات الحالية", color: "text-orange-500" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {/* Profile Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mb-12 overflow-hidden"
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-3xl blur-2xl" />
            
            <div className="relative text-center py-8 md:py-12 px-6 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-3xl">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/70 text-background rounded-full flex items-center justify-center mb-4 shadow-lg shadow-primary/30"
              >
                <User className="w-10 h-10" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="font-heading text-3xl md:text-4xl">{user?.user_metadata?.full_name || "أهلاً بك"}</h1>
                <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2 flex-wrap">
                  <Mail className="w-4 h-4" /> {user?.email}
                </p>
                <p className="text-xs text-muted-foreground mt-3">عضو منذ {new Date(user?.created_at).toLocaleDateString('ar-EG')}</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Main Menu Items */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
          >
            {mainItems.map((it) => (
              <motion.div key={it.to} variants={itemVariants}>
                <Link 
                  to={it.to} 
                  className="flex items-center gap-4 p-4 md:p-6 border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group rounded-xl shadow-sm hover:shadow-md"
                >
                  <div className={`${it.color} p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform`}>
                    <it.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading text-base">{it.label}</p>
                    <p className="text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Settings Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mb-8"
          >
            <h2 className="font-heading text-lg px-2 text-muted-foreground">أكثر خيارات</h2>
            {settingsItems.map((it) => (
              <motion.div key={it.to} variants={itemVariants}>
                <Link 
                  to={it.to} 
                  className="flex items-center gap-4 p-4 md:p-5 border border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group rounded-xl"
                >
                  <div className={`${it.color} p-2 bg-primary/10 rounded-lg`}>
                    <it.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading text-base">{it.label}</p>
                    <p className="text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-30 group-hover:opacity-100" />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Logout Button */}
          <motion.button 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5 }}
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-4 p-4 md:p-5 border border-destructive/50 bg-destructive/5 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300 mt-8 rounded-xl font-heading text-base"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </motion.button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountPage;