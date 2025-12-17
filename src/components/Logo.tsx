import logoFinal from "@/assets/ermgold-logo-final.jpeg";
import logoNew from "@/assets/ermgold-logo-new.jpeg";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "auth" | "invoice" | "nav" | "footer";
  className?: string;
}

const sizeClasses = {
  sm: "h-14 w-auto",
  md: "h-24 w-auto",
  lg: "h-32 w-auto",
  xl: "h-44 w-auto",
};

const logos = {
  auth: logoNew,
  invoice: logoNew,
  nav: logoFinal,
  footer: logoFinal,
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
