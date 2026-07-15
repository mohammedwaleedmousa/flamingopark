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
    <div dir="rtl" className="container mx-auto px-4 pt-20 md:pt-24">
      <button
        onClick={handleBack}
        aria-label="رجوع للخلف"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ChevronRight className="w-3 h-3" />
        رجوع للخلف
      </button>
    </div>
  );
};

export default GlobalBackButton;