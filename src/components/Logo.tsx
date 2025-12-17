import ermgoldLogo from "@/assets/ermgold-logo-final.jpeg";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-14 w-auto",
  md: "h-24 w-auto",
  lg: "h-32 w-auto",
  xl: "h-44 w-auto",
};

const Logo = ({ size = "md", className = "" }: LogoProps) => {
  return <img src={ermgoldLogo} alt="ERMGOLD Logo" className={`object-contain ${sizeClasses[size]} ${className}`} />;
};

export default Logo;
