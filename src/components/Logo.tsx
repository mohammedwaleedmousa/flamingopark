interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "auth" | "invoice" | "nav" | "footer";
  className?: string;
  invert?: boolean;
  showIcon?: boolean;
  showArabic?: boolean;
}

const sizeMap = {
  sm: { en: "text-[13px]", ar: "text-[11px]", icon: 22 },
  md: { en: "text-[15px]", ar: "text-[12px]", icon: 28 },
  lg: { en: "text-[20px]", ar: "text-[14px]", icon: 36 },
  xl: { en: "text-[28px]", ar: "text-[18px]", icon: 48 },
};

/** Stylized flamingo silhouette mark — pink */
const FlamingoMark = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="flam-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(335 95% 70%)" />
        <stop offset="100%" stopColor="hsl(335 85% 50%)" />
      </linearGradient>
    </defs>
    <g fill="url(#flam-g)">
      {/* Body */}
      <path d="M28 22c-7 0-13 5-13 13 0 5 3 9 7 11l-3 7c-.4 1 .3 2 1.3 2h17c1 0 1.7-1 1.3-2l-3-7c4-2 7-6 7-11 0-8-6-13-14-13z" />
      {/* Long neck curving up */}
      <path d="M38 22c0-2 2-4 5-5 4-1 6-4 6-7s-2-5-5-5-5 2-5 5c0 2 1 3 2 4-3 1-5 4-5 7v3l2-2z" />
      {/* Beak */}
      <path d="M50 4l5-1-2 4-3 1z" fill="hsl(240 14% 14%)" />
      {/* Eye */}
      <circle cx="46" cy="7" r="1.2" fill="hsl(240 14% 14%)" />
      {/* Legs */}
      <rect x="26" y="52" width="2" height="9" rx="1" />
      <rect x="36" y="52" width="2" height="9" rx="1" />
    </g>
  </svg>
);

const Logo = ({
  size = "md",
  variant = "nav",
  className = "",
  invert = false,
  showIcon = true,
  showArabic = true,
}: LogoProps) => {
  const s = sizeMap[size];
  return (
    <span
      aria-label={`Flamingo Park - ${variant}`}
      className={`inline-flex items-center gap-2 leading-none ${className}`}
      dir="ltr"
    >
      {showIcon && <FlamingoMark size={s.icon} />}
      <span className="flex flex-col items-start">
        <span
          className={`logo-flamingo ${s.en} ${invert ? "text-white" : "text-foreground"}`}
          style={{ letterSpacing: "0.18em", fontWeight: 600 }}
        >
          FLAMINGO<span className="text-primary">PARK</span>
        </span>
        {showArabic && (
          <span
            className={`${s.ar} mt-1 ${invert ? "text-white/80" : "text-primary"}`}
            style={{ fontFamily: "'Inter','SF Arabic','Geeza Pro',sans-serif", letterSpacing: "0.04em" }}
            dir="rtl"
          >
            فلامنجو بارك
          </span>
        )}
      </span>
    </span>
  );
};

export default Logo;
