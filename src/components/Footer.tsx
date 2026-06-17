import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.52 3.48A11.86 11.86 0 0012.06 0C5.55 0 .26 5.29.26 11.8c0 2.08.55 4.11 1.59 5.9L0 24l6.45-1.69a11.78 11.78 0 005.61 1.43h.01c6.51 0 11.8-5.29 11.8-11.8 0-3.15-1.23-6.11-3.35-8.46zM12.07 21.7h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.21-3.83 1 1.02-3.73-.23-.38a9.9 9.9 0 0115.32-12.5 9.84 9.84 0 012.9 7c0 5.46-4.44 9.9-9.76 9.9zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17-.35.22-.65.07c-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.48 1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35z"/>
  </svg>
);

const Footer = () => {
  const [socials, setSocials] = useState({ whatsapp: "", instagram: "" });

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["social_whatsapp", "social_instagram"])
      .then(({ data }) => {
        if (!data) return;
        const next = { whatsapp: "", instagram: "" };
        data.forEach((s) => {
          let val = s.value as unknown;
          if (typeof val === "string") {
            try { val = JSON.parse(val); } catch { /* keep string */ }
          }
          if (s.key === "social_whatsapp" && typeof val === "string") next.whatsapp = val;
          if (s.key === "social_instagram" && typeof val === "string") next.instagram = val;
        });
        setSocials(next);
      });
  }, []);

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="logo-flamingo text-4xl text-primary mb-3">Flamingo</h2>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            وجهتك للأناقة العصرية. تشكيلة منتقاة من الملابس والإكسسوارات الفاخرة لتجربة تسوق استثنائية.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            {socials.whatsapp && (
              <a
                href={socials.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-foreground flex items-center justify-center transition-all"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </a>
            )}
            {socials.instagram && (
              <a
                href={socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-foreground flex items-center justify-center transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            <a
              href="mailto:hello@flamingo.store"
              aria-label="Email"
              className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-foreground flex items-center justify-center transition-all"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
          <div>
            <h3 className="font-heading text-primary text-base mb-3">المتجر</h3>
            <ul className="space-y-2 font-body text-sm text-secondary">
              <li><Link to="/products" className="hover:text-primary transition-colors">جميع المنتجات</Link></li>
              <li><Link to="/products?filter=featured" className="hover:text-primary transition-colors">وافد حديثاً</Link></li>
              <li><Link to="/products?filter=bestseller" className="hover:text-primary transition-colors">الأكثر مبيعاً</Link></li>
              <li><Link to="/offers" className="hover:text-primary transition-colors">العروض</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-primary text-base mb-3">المساعدة</h3>
            <ul className="space-y-2 font-body text-sm text-secondary">
              <li><Link to="/about" className="hover:text-primary transition-colors">من نحن</Link></li>
              <li><Link to="/reviews" className="hover:text-primary transition-colors">آراء العملاء</Link></li>
              <li><Link to="/favorites" className="hover:text-primary transition-colors">المفضلة</Link></li>
              <li><Link to="/checkout" className="hover:text-primary transition-colors">سياسة الشحن</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="font-body text-xs text-muted-foreground">© 2026 Flamingo. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;