import logoRegister from "@/assets/ermgold-logo-new.jpeg";
import logoNav from "@/assets/ermgold-logo-final.jpeg";
import logoFooter from "@/assets/ermgold-logo-footer.jpeg";
import logoInvoice from "@/assets/ermgold-logo-new.jpeg";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "register" | "nav" | "footer" | "invoice";
  className?: string;
}

const sizeClasses = {
  sm: "h-14 w-auto",
  md: "h-24 w-auto",
  lg: "h-32 w-auto",
  xl: "h-44 w-auto",
};

const logos = {
  register: logoRegister,
  nav: logoNav,
  footer: logoFooter,
  invoice: logoInvoice,
};

const Logo = ({ size = "md", variant = "nav", className = "" }: LogoProps) => {
  return (
    <img
      src={logos[variant]}
      alt={`ERMGOLD Logo - ${variant}`}
      className={`object-contain ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
