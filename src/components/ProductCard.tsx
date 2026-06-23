import { Link } from "react-router-dom";
import { useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { Product, useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
  index?: number;
  badge?: "NEW IN" | "LIMITED" | "BEST SELLER" | "HOT" | null;
}

const ProductCard = ({ product, badge, index = 0 }: ProductCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart, openCart } = useStore();
  const isLiked = isFavorite(product.id);
  const currency = "ر.ي";
  const [heartBeat, setHeartBeat] = useState(false);
  const [bagPop, setBagPop] = useState(false);
  const hasSecondImage = (product.images?.length ?? 0) > 1;

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowLiked = toggleFavorite(product);
    setHeartBeat(true);
    setTimeout(() => setHeartBeat(false), 350);
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
    setBagPop(true);
    setTimeout(() => setBagPop(false), 400);
    toast({ title: "تمت الإضافة إلى السلة" });
    openCart();
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block animate-card-rise"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      dir="rtl"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <>
            <img
              src={product.images[0]}
              alt={product.nameAr}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover transition-all duration-[900ms] ease-out group-hover:scale-[1.06] ${hasSecondImage ? "group-hover:opacity-0" : ""}`}
            />
            {hasSecondImage && (
              <img
                src={product.images[1]}
                alt={product.nameAr}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-[900ms] ease-out group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />

        {/* Badges stack — top right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
          {computedBadge && (
            <span className="bg-background text-foreground text-[9px] font-medium tracking-[0.25em] uppercase px-2.5 py-1 shadow-sm">
              {computedBadge}
            </span>
          )}
          {product.discount ? (
            <span className="bg-foreground text-background text-[10px] font-medium px-2 py-1 animate-badge-pulse">
              -{product.discount}%
            </span>
          ) : null}
          {product.isBestSeller && (
            <span className="bg-background text-foreground text-[9px] font-medium tracking-[0.25em] uppercase px-2.5 py-1 shadow-sm border border-border">
              BEST
            </span>
          )}
        </div>

        <button
          onClick={handleLike}
          aria-label="favorite"
          className={`absolute top-3 left-3 w-9 h-9 flex items-center justify-center transition-all active:scale-90 ${
            isLiked
              ? "bg-foreground text-background"
              : "bg-background/90 text-foreground hover:bg-foreground hover:text-background"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""} ${heartBeat ? "animate-[heart-beat_0.4s_ease-out]" : ""}`} />
        </button>

        {/* Quick add bar — slides up on hover */}
        {product.inStock && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3 text-[10px] tracking-[0.35em] uppercase active:scale-[0.98] transition-transform"
            >
              <ShoppingBag className={`w-3.5 h-3.5 ${bagPop ? "animate-[heart-beat_0.4s_ease-out]" : ""}`} /> إضافة سريعة
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
        {/* Mini star row */}
        <div className="flex items-center justify-center gap-0.5 mt-1.5 text-foreground/80">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} viewBox="0 0 20 20" className="w-3 h-3 fill-current opacity-90">
              <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 14.9 4.8 17.8l1-5.9L1.5 7.7l5.9-.9z" />
            </svg>
          ))}
          <span className="text-[10px] text-muted-foreground mr-1">(4.9)</span>
        </div>
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