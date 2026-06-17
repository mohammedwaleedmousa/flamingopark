import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { Product, useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
  index?: number;
  badge?: "NEW IN" | "LIMITED" | "BEST SELLER" | null;
}

const ProductCard = ({ product, badge }: ProductCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isLiked = isFavorite(product.id);
  const currency = "ر.ي";

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowLiked = toggleFavorite(product);
    toast({
      title: nowLiked ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة",
    });
  };

  const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  // Auto-pick a badge if none supplied
  const computedBadge =
    badge ??
    (product.isFeatured ? "NEW IN" : product.discount ? "LIMITED" : null);

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.nameAr}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {computedBadge && (
          <span className="absolute top-3 right-3 bg-primary-container text-primary text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full">
            {computedBadge}
          </span>
        )}

        <button
          onClick={handleLike}
          aria-label="favorite"
          className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isLiked
              ? "bg-primary text-primary-foreground"
              : "bg-card/90 text-foreground hover:bg-card"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
        </button>

        {!product.inStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="bg-foreground text-background text-xs font-bold px-3 py-1.5 rounded-full">
              نفد المخزون
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 px-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
          {product.category}
        </p>
        <h3 className="font-heading text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {product.nameAr}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-primary text-base font-semibold">
              {finalPrice.toFixed(0)}
            </span>
            <span className="text-[10px] text-muted-foreground">{currency}</span>
            {product.originalPrice && (
              <span className="text-[11px] text-muted-foreground line-through mr-1">
                {product.originalPrice.toFixed(0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-accent">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-[11px] font-medium">4.8</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;