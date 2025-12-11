import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { useStore } from '@/store/useStore';

const Footer = () => {
  const { country } = useStore();
  
  // Location based on country
  const location = country === 'YE' ? 'عدن، اليمن' : 'جدة، المملكة العربية السعودية';
  const phoneNumber = country === 'YE' ? '+967 123 456 789' : '+966 12 345 6789';

  return (
    <footer className="bg-secondary text-gold-light/80">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <h2 className="logo-ermgold text-3xl mb-4">ERMGOLD</h2>
            <p className="font-body text-sm leading-relaxed opacity-70">
              مجوهرات فاخرة بأعلى معايير الجودة والأناقة
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="p-2 border border-gold/30 rounded-full hover:bg-gold hover:text-secondary transition-all duration-300">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 border border-gold/30 rounded-full hover:bg-gold hover:text-secondary transition-all duration-300">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 border border-gold/30 rounded-full hover:bg-gold hover:text-secondary transition-all duration-300">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-lg text-gold mb-6">روابط سريعة</h3>
            <ul className="space-y-3 font-body text-sm">
              <li><Link to="/products" className="hover:text-gold transition-colors">المنتجات</Link></li>
              <li><Link to="/offers" className="hover:text-gold transition-colors">العروض</Link></li>
              <li><Link to="/about" className="hover:text-gold transition-colors">من نحن</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-heading text-lg text-gold mb-6">التصنيفات</h3>
            <ul className="space-y-3 font-body text-sm">
              <li><Link to="/products?category=necklaces" className="hover:text-gold transition-colors">القلائد</Link></li>
              <li><Link to="/products?category=rings" className="hover:text-gold transition-colors">الخواتم</Link></li>
              <li><Link to="/products?category=bracelets" className="hover:text-gold transition-colors">الأساور</Link></li>
              <li><Link to="/products?category=earrings" className="hover:text-gold transition-colors">الأقراط</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-lg text-gold mb-6">تواصل معنا</h3>
            <ul className="space-y-4 font-body text-sm">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gold" />
                <span dir="ltr">{phoneNumber}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gold" />
                <span>info@ermgold.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gold mt-1" />
                <span>{location}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gold/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs opacity-60">
            © 2024 ERMGOLD. جميع الحقوق محفوظة
          </p>
          <div className="flex items-center gap-6 font-body text-xs opacity-60">
            <Link to="/privacy" className="hover:text-gold transition-colors">سياسة الخصوصية</Link>
            <Link to="/terms" className="hover:text-gold transition-colors">الشروط والأحكام</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
