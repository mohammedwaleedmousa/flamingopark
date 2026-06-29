import { Link } from "react-router-dom";
import { useState } from "react";
import { Heart, Star } from "lucide-react";
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
  const currency = "ر.س";
  const [heartBeat, setHeartBeat] = useState(false);
  const hasSecondImage = (product.images?.length ?? 0) > 1;

  const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const computedBadge =
    badge ??
    (product.isFeatured ? "جديد" : product.discount ? `-${product.discount}%` : null);

  // Deterministic mock rating per product (until DB rating exists)
  const seed = product.id?.split("").reduce((s, c) => s + c.charCodeAt(0), 0) || 0;
  const rating = (4 + ((seed % 9) / 10)).toFixed(1);

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-border/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)] transition-all"
      dir="rtl"
    >
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        {product.images?.[0] ? (
          <>
            <img
              src={product.images[0]}
              alt={product.nameAr}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover transition-all duration-[700ms] ease-out group-hover:scale-[1.06] ${hasSecondImage ? "group-hover:opacity-0" : ""}`}
            />
            {hasSecondImage && (
              <img
                src={product.images[1]}
                alt={product.nameAr}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-[700ms] ease-out group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {/* Heart — top-left (RTL: visually left side) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const nowLiked = toggleFavorite(product);
            setHeartBeat(true);
            setTimeout(() => setHeartBeat(false), 350);
            toast({ title: nowLiked ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة" });
          }}
          aria-label="favorite"
          className="absolute top-3 left-3 w-9 h-9 grid place-items-center rounded-full bg-white/95 shadow-sm hover:bg-white transition active:scale-90 z-10"
        >
          <Heart
            className={`w-[18px] h-[18px] ${isLiked ? "fill-primary text-primary" : "text-foreground"} ${heartBeat ? "animate-[heart-beat_0.4s_ease-out]" : ""}`}
            strokeWidth={1.8}
          />
        </button>

        {/* Badge — bottom-left of image (pink pill) */}
        {computedBadge && (
          <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {computedBadge}
          </span>
        )}

        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-foreground text-background text-[11px] rounded-full px-4 py-1.5">
              نفد المخزون
            </span>
          </div>
        )}
      </div>

      <div className="px-3 py-3 text-center">
        <h3 className="text-[13px] text-foreground/80 line-clamp-1 leading-snug">
          <span className="font-semibold text-foreground">{product.brand}</span>
          <span className="mx-1">·</span>
          {product.nameAr}
        </h3>
        <div className="mt-2 flex items-baseline justify-center gap-2">
          <span className="text-primary font-bold text-[15px] tabular-nums">
            {finalPrice.toFixed(0)} {currency}
          </span>
          {product.discount && (
            <span className="text-[11px] text-muted-foreground line-through tabular-nums">
              {product.price.toFixed(0)}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-foreground font-medium tabular-nums">{rating}</span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;