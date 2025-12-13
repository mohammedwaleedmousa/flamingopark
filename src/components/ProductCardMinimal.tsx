import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Eye } from 'lucide-react';
import { Product } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { useFavorites } from '@/hooks/useFavorites';
import { toast } from '@/hooks/use-toast';


interface ProductCardMinimalProps {
  product: Product;
  index?: number;
}

const ProductCardMinimal = ({ product, index = 0 }: ProductCardMinimalProps) => {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="group"
    >
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-lg bg-beige border-2 border-gold transition-all duration-300 hover:border-gold-light hover:shadow-[0_10px_30px_-8px_hsl(var(--gold)/0.3)]">
          {/* Image Container - Fixed square aspect ratio */}
          <div className="relative aspect-square overflow-hidden">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.nameAr}
                loading="lazy"
                className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-beige">
                <Eye className="w-8 h-8 opacity-40" />
              </div>
            )}

            {/* OUT OF STOCK - Big Red Badge */}
            {!product.inStock && (
              <div className="absolute inset-0 bg-secondary/40 flex items-center justify-center">
                <span className="bg-destructive text-white text-xl font-bold px-6 py-3 rounded-xl shadow-lg transform -rotate-12">
                  OUT
                </span>
              </div>
            )}

            {/* Discount Badge */}
            {product.discount && (
              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center justify-center bg-gold text-secondary text-xs font-bold px-2 py-1 rounded-md">
                  -{product.discount}%
                </span>
              </div>
            )}

            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 ${
                isLiked 
                  ? 'bg-gold text-secondary' 
                  : 'bg-background/80 text-foreground hover:bg-gold hover:text-secondary'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Quick Add Button - Appears on hover */}
            {product.inStock && (
              <div className="absolute bottom-3 left-3 right-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <button
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary text-secondary-foreground font-medium text-sm rounded-lg transition-all duration-300 hover:bg-secondary/90"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>أضف للسلة</span>
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 bg-background border-t border-border/20">
            {/* Brand */}
            <span className="text-[11px] font-medium text-gold uppercase tracking-wider">
              {product.brand}
            </span>
            
            {/* Product Name */}
            <h3 className="font-heading text-sm text-foreground mt-1 mb-2 line-clamp-1 group-hover:text-gold transition-colors">
              {product.nameAr}
            </h3>
            
            {/* Price Section */}
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-base text-foreground">
                {discountedPrice.toFixed(0)} <span className="text-xs font-normal">{currency}</span>
              </span>
              {product.originalPrice && (
                <span className="text-muted-foreground line-through text-xs">
                  {product.originalPrice.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCardMinimal;
