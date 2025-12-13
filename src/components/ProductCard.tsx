import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, Share2, Heart, Eye } from 'lucide-react';
import { Product } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { useFavorites } from '@/hooks/useFavorites';
import { toast } from '@/hooks/use-toast';


interface ProductCardProps {
  product: Product;
  index?: number;
  compact?: boolean;
}

const ProductCard = ({ product, index = 0, compact = false }: ProductCardProps) => {
  const { addToCart, country } = useStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const currency = country === 'SA' ? 'ر.س' : 'ر.ي';
  const isLiked = isFavorite(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast({
      title: 'تمت الإضافة',
      description: `${product.nameAr} أُضيف إلى السلة`,
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.share({
        title: product.nameAr,
        text: product.descriptionAr,
        url: `/product/${product.slug}`,
      });
    } catch {
      navigator.clipboard.writeText(window.location.origin + `/product/${product.slug}`);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ رابط المنتج',
      });
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowLiked = toggleFavorite(product);
    toast({
      title: nowLiked ? 'تمت الإضافة' : 'تمت الإزالة',
      description: nowLiked ? 'تمت إضافة المنتج للمفضلة' : 'تمت إزالة المنتج من المفضلة',
    });
  };

  const discountedPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="group"
    >
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative bg-cream rounded-lg overflow-hidden border-2 border-gold transition-all duration-500 hover:border-gold-light hover:shadow-[0_15px_40px_-10px_hsl(var(--gold)/0.4)]">
          {/* Image Container - Fixed square aspect ratio */}
          <div className="relative overflow-hidden aspect-square">
            {/* Background - Solid cream color */}
            <div className="absolute inset-0 bg-cream" />
            
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.nameAr}
                loading="lazy"
                className="w-full h-full object-contain p-2 transition-all duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Eye className="w-8 h-8 opacity-40" />
                <span className="text-xs">لا توجد صورة</span>
              </div>
            )}
            
            {/* Gold Shine Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

            {/* OUT OF STOCK - Big Red Badge */}
            {!product.inStock && (
              <div className="absolute inset-0 bg-secondary/40 flex items-center justify-center">
                <span className="bg-destructive text-white text-xl font-bold px-6 py-3 rounded-xl shadow-lg transform -rotate-12">
                  OUT
                </span>
              </div>
            )}

            {/* Top Actions */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
              {/* Badges */}
              <div className="flex flex-col gap-1.5">
                {product.discount && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center bg-gradient-to-r from-gold to-gold-light text-secondary text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg"
                  >
                    -{product.discount}%
                  </motion.span>
                )}
              </div>
              
              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                  isLiked 
                    ? 'bg-gold text-secondary shadow-lg scale-110' 
                    : 'bg-background/70 text-foreground hover:bg-background hover:scale-110'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Bottom Actions - Slide Up */}
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold hover:bg-gold-light text-secondary font-medium text-sm rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>أضف للسلة</span>
                </button>
                <button
                  onClick={handleShare}
                  className="p-2.5 bg-background/90 backdrop-blur-sm text-foreground rounded-lg hover:bg-background transition-all duration-300 shadow-lg"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`relative ${compact ? 'p-3' : 'p-4'}`}>
            {/* Brand */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium text-gold uppercase tracking-wider">
                {product.brand}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            
            {/* Product Name */}
            <h3 className={`font-heading text-foreground group-hover:text-gold transition-colors duration-300 mb-3 line-clamp-2 leading-relaxed ${compact ? 'text-sm' : 'text-base'}`}>
              {product.nameAr}
            </h3>
            
            {/* Price Section */}
            <div className="flex items-end justify-between gap-2">
              <div className="flex flex-col">
                <span className={`font-heading font-semibold text-foreground ${compact ? 'text-lg' : 'text-xl'}`}>
                  {discountedPrice.toFixed(0)} <span className="text-xs font-normal">{currency}</span>
                </span>
                {product.originalPrice && (
                  <span className="text-muted-foreground line-through text-xs">
                    {product.originalPrice.toFixed(0)} {currency}
                  </span>
                )}
              </div>
              
              {/* Stock Indicator */}
              {product.inStock && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">متوفر</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Accent Line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
