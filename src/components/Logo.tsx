interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "auth" | "invoice" | "nav" | "footer";
  className?: string;
  invert?: boolean;
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
};

const Logo = ({ size = "md", variant = "nav", className = "", invert = false }: LogoProps) => {
  return (
    <span
      aria-label={`Flamingo - ${variant}`}
      className={`logo-flamingo inline-block leading-none ${sizeClasses[size]} ${
        invert ? "text-white" : "text-foreground"
      } ${className}`}
    >
      FLAMINGO
    </span>
  );
};

export default Logo;
