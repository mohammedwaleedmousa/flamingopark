import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import { Product, useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
  index?: number;
  badge?: "NEW IN" | "LIMITED" | "BEST SELLER" | "HOT" | null;
}

const ProductCard = ({ product, badge }: ProductCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart, openCart } = useStore();
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

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    toast({ title: "تمت الإضافة إلى السلة" });
    openCart();
  };

  return (
    <Link to={`/product/${product.slug}`} className="group block" dir="rtl">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.nameAr}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-3200 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />

        {computedBadge && (
          <span className="absolute top-3 right-3 bg-background text-foreground text-[9px] font-medium tracking-[0.25em] uppercase px-2.5 py-1">
            {computedBadge}
          </span>
        )}

        {product.discount && (
          <span className="absolute top-3 right-3 bg-foreground text-background text-[10px] font-medium px-2 py-1 mt-7">
            -{product.discount}%
          </span>
        )}

        <button
          onClick={handleLike}
          aria-label="favorite"
          className={`absolute top-3 left-3 w-9 h-9 flex items-center justify-center transition-all ${
            isLiked
              ? "bg-foreground text-background"
              : "bg-background/90 text-foreground hover:bg-foreground hover:text-background"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
        </button>

        {/* Quick add bar — slides up on hover */}
        {product.inStock && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3 text-[10px] tracking-[0.35em] uppercase"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> إضافة سريعة
            </button>
          </div>
        )}

        {!product.inStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="bg-foreground text-background text-[10px] tracking-[0.3em] uppercase px-4 py-2">
              نفد المخزون
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 px-1 text-center">
        <p className="text-[9px] uppercase tracking-[0.35em] text-muted-foreground mb-1.5">
          {product.brand}
        </p>
        <h3 className="font-heading text-sm md:text-base text-foreground line-clamp-2 leading-snug min-h-[2.5em]">
          {product.nameAr}
        </h3>
        <div className="flex items-baseline justify-center gap-2 mt-2">
          <span className="font-body text-sm text-foreground font-medium">
            {finalPrice.toFixed(0)} {currency}
          </span>
          {product.discount && (
            <span className="text-[11px] text-muted-foreground line-through">
              {product.price.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;