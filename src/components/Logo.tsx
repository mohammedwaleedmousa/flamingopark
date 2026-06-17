interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "auth" | "invoice" | "nav" | "footer";
  className?: string;
  invert?: boolean;
}

const sizeClasses = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

const Logo = ({ size = "md", variant = "nav", className = "", invert = false }: LogoProps) => {
  return (
    <span
      aria-label={`Flamingo - ${variant}`}
      className={`logo-flamingo inline-block leading-none ${sizeClasses[size]} ${
        invert ? "text-white" : "text-primary"
      } ${className}`}
    >
      Flamingo
    </span>
  );
};

export default Logo;
