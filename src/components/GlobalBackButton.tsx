import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Routes where the back button should NOT show
const HIDDEN_ROUTES = ["/", "/home", "/index", "/index.html", "/auth", "/signin", "/signup"];

const GlobalBackButton = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Hide on home / auth / admin (admin has its own sidebar navigation)
  if (HIDDEN_ROUTES.includes(pathname)) return null;
  if (pathname.startsWith("/admin")) return null;

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  return (
    <button
      onClick={handleBack}
      aria-label="رجوع"
      dir="rtl"
      className="fixed top-20 right-3 z-40 flex items-center gap-1 h-9 px-3 rounded-full bg-background/90 border border-border shadow-sm text-sm text-foreground hover:bg-muted hover:border-gold/50 transition-all backdrop-blur-sm"
    >
      <ChevronRight className="w-4 h-4" />
      <span className="font-medium">رجوع</span>
    </button>
  );
};

export default GlobalBackButton;