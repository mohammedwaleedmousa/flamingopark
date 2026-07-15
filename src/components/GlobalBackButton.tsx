import { useLocation, useNavigate } from "react-router-dom";

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
    <div dir="rtl" className="w-full bg-background pt-20 pb-2 px-4">
      <button
        onClick={handleBack}
        aria-label="رجوع للخلف"
        className="text-sm text-foreground underline decoration-foreground underline-offset-4 hover:opacity-70 transition-opacity"
      >
        رجوع للخلف
      </button>
    </div>
  );
};

export default GlobalBackButton;