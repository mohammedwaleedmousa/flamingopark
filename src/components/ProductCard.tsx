import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, Share2 } from 'lucide-react';
import { Product } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { toast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addToCart, openCart } = useStore();

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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link to={`/product/${product.slug}`} className="block group">
        <div className="card-luxury overflow-hidden">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            <img
              src={product.images[0]}
              alt={product.nameAr}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Discount Badge */}
            {product.discount && (
              <div className="absolute top-3 right-3 bg-gold text-secondary text-xs font-bold px-2 py-1 rounded">
                -{product.discount}%
              </div>
            )}

            {/* Quick Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-secondary/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold text-secondary font-body text-sm rounded hover:bg-gold-light transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  إضافة للسلة
                </button>
                <button
                  onClick={handleShare}
                  className="p-2.5 bg-background/90 text-foreground rounded hover:bg-background transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-xs text-muted-foreground font-body mb-1">{product.brand}</p>
            <h3 className="font-heading text-base text-foreground group-hover:text-gold transition-colors mb-2">
              {product.nameAr}
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg text-gold">
                ${discountedPrice.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.originalPrice.toFixed(2)}
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
