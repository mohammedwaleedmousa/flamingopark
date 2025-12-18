import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingBag, Heart, Eye } from "lucide-react";
import { Product } from "@/store/useStore";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";

interface ProductCardMinimalProps {
  product: Product;
  index?: number;
}

const ProductCardMinimal = ({ product, index = 0 }: ProductCardMinimalProps) => {
  const { addToCart, country } = useStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const currency = country === "SA" ? "ر.س" : "ر.ي";
  const isLiked = isFavorite(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast({
      title: "تمت الإضافة",
      description: `${product.nameAr} أُضيف إلى السلة`,
    });
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowLiked = toggleFavorite(product);
    toast({
      title: nowLiked ? "تمت الإضافة" : "تمت الإزالة",
      description: nowLiked ? "تمت إضافة المنتج للمفضلة" : "تمت إزالة المنتج من المفضلة",
    });
  };

  const discountedPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;

  return (
    // داخل return
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group h-full"
    >
      <Link to={`/product/${product.slug}`} className="block h-full">
        <div className="relative overflow-hidden rounded-lg bg-beige border-2 border-gold transition-all duration-300 hover:border-gold-light hover:shadow-[0_10px_30px_-8px_hsl(var(--gold)/0.3)] h-full grid grid-rows-[1fr_auto]">
          {/* الصورة - تملأ كامل القسم */}
          <div className="w-full h-full overflow-hidden">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.nameAr}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-beige">
                <Eye className="w-8 h-8 opacity-40" />
              </div>
            )}
          </div>

          {/* المحتوى */}
          <div className="p-4 bg-background border-t border-border/20 flex flex-col flex-1">
            {/* Brand */}
            <span className="text-[11px] font-medium text-gold uppercase tracking-wider">{product.brand}</span>

            {/* Product Name */}
            <h3 className="font-heading text-sm text-foreground mt-1 mb-2 line-clamp-2 group-hover:text-gold transition-colors">
              {product.nameAr}
            </h3>

            {/* Price Section - ثابت في الأسفل */}
            <div className="flex items-center gap-2 mt-auto">
              <span className="font-heading font-semibold text-base text-foreground">
                {discountedPrice.toFixed(0)} <span className="text-xs font-normal">{currency}</span>
              </span>
              {product.originalPrice && (
                <span className="text-muted-foreground line-through text-xs">{product.originalPrice.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCardMinimal;
