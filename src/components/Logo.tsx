interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "auth" | "invoice" | "nav" | "footer";
  className?: string;
  invert?: boolean;
}

const sizeClasses = {
  sm: "1.125rem",
  md: "1.25rem",
  lg: "1.5rem",
  xl: "2.25rem",
};

const Logo = ({ size = "md", variant = "nav", className = "", invert = false }: LogoProps) => {
  return (
    <span
      aria-label={`Flamingo - ${variant}`}
      className={`logo-flamingo inline-block leading-none ${
        invert ? "text-white" : "text-foreground"
      } ${className}`}
      style={{ fontSize: sizeClasses[size] }}
    >
      FLAMINGO
    </span>
  );
};

export default Logo;
