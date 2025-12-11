import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, Share2 } from 'lucide-react';
import { Product } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { toast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  index?: number;
  compact?: boolean;
}

const ProductCard = ({ product, index = 0, compact = false }: ProductCardProps) => {
  const { addToCart, country } = useStore();
  const currency = country === 'SA' ? 'ريال' : 'ريال';

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

  const discountedPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <Link to={`/product/${product.slug}`} className="block group">
        <div className="card-luxury overflow-hidden">
          {/* Image Container */}
          <div className={`relative overflow-hidden bg-muted ${compact ? 'aspect-[3/4]' : 'aspect-square'}`}>
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.nameAr}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                لا توجد صورة
              </div>
            )}
            
            {/* Discount Badge */}
            {product.discount && (
              <div className="absolute top-3 right-3 bg-gold text-secondary text-xs font-bold px-2 py-1 rounded">
                -{product.discount}%
              </div>
            )}

            {/* Quick Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-secondary/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 bg-gold text-secondary font-body text-xs md:text-sm rounded hover:bg-gold-light transition-colors duration-200"
                >
                  <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">إضافة للسلة</span>
                  <span className="sm:hidden">أضف</span>
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 md:p-2.5 bg-background/90 text-foreground rounded hover:bg-background transition-colors duration-200"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`${compact ? 'p-3' : 'p-4'}`}>
            <p className={`text-muted-foreground font-body mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>{product.brand}</p>
            <h3 className={`font-heading text-foreground group-hover:text-gold transition-colors duration-200 mb-2 line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}>
              {product.nameAr}
            </h3>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <span className={`font-heading text-gold ${compact ? 'text-base' : 'text-lg'}`}>
                {discountedPrice.toFixed(2)} {currency}
              </span>
              {product.originalPrice && (
                <span className={`text-muted-foreground line-through ${compact ? 'text-xs' : 'text-sm'}`}>
                  {product.originalPrice.toFixed(2)} {currency}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
