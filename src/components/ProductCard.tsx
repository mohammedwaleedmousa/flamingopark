import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Product } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
  index?: number;
  badge?: "NEW IN" | "LIMITED" | "BEST SELLER" | "HOT" | null;
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
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.nameAr}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {computedBadge && (
          <span className="absolute top-4 right-4 bg-background text-foreground text-[10px] font-medium tracking-[0.25em] uppercase px-3 py-1.5">
            {computedBadge}
          </span>
        )}

        <button
          onClick={handleLike}
          aria-label="favorite"
          className={`absolute top-4 left-4 w-9 h-9 flex items-center justify-center transition-all ${
            isLiked
              ? "bg-foreground text-background"
              : "bg-background/90 text-foreground hover:bg-background"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
        </button>

        {!product.inStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="bg-foreground text-background text-[10px] tracking-[0.3em] uppercase px-4 py-2">
              نفد المخزون
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 px-1 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
          {product.category}
        </p>
        <h3 className="font-heading text-base md:text-lg text-foreground line-clamp-2 leading-snug">
          {product.nameAr}
        </h3>
        <div className="flex items-baseline justify-center gap-2 mt-3">
          <span className="font-body text-sm text-foreground">
            {finalPrice.toFixed(0)} {currency}
          </span>
          {product.originalPrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              {product.originalPrice.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;