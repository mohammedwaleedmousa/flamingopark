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

const ProductCard = ({ product, badge }: ProductCardProps) => {
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
  <Link to={`/product/${product.slug}`} className="group block" dir="rtl">

    <div className="
      relative aspect-[4/8] sm:aspect-[3/4]
      bg-white
      border border-pink-100/20
      rounded-[20px]
      overflow-hidden
      flex flex-col

      transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
      hover:-translate-y-2
      hover:shadow-[0_50px_100px_-40px_rgba(255,105,180,0.25)]
    ">

      {/* IMAGE FULL AREA */}
      <div className="relative flex-1 overflow-hidden bg-neutral-100 ">

        <img
          src={product.images?.[0]}
          alt={product.nameAr}
          className="
            w-full h-full object-cover
            transition duration-1000 ease-out
            group-hover:scale-110
          "
        />

        {/* soft cinematic flamingo overlay */}
        <div className="
          absolute inset-0
          bg-gradient-to-t from-black/30 via-transparent to-transparent
          opacity-0 group-hover:opacity-100
          transition duration-500
        " />

      </div>

      {/* INFO BASE (always visible minimal) */}
      <div className="p-4 space-y-2 bg-white">

        <div className="flex items-center justify-between">

          <p className="text-[10px] tracking-[0em] uppercase text-pink-400">
            {product.brand}
          </p>

          <span className="text-[11px] text-neutral-500 flex items-center gap-1">
            <span className="text-pink-400">★</span>
            {product.rating ? Number(product.rating).toFixed(1) : "4.5"}
          </span>

        </div>

        <h3 className="text-sm font-medium text-neutral-900 line-clamp-2">
          {product.nameAr}
        </h3>

        <span className="text-sm font-semibold text-black">
          {Math.floor(finalPrice)} {currency}
        </span>

      </div>

      {/* 🛒 EDITORIAL ACTION BAR (NEW CONCEPT) */}
      {product.inStock && (
        <div className="
          absolute bottom-0 left-0 right-0

          translate-y-full group-hover:translate-y-0
          transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]

          bg-white/80 backdrop-blur-xl
          border-t border-pink-100/30

          flex items-center justify-between

          px-4 py-3
        ">

          <span className="
            text-[10px]
            tracking-[0.4em]
            uppercase
            text-neutral-500
          ">
            فلامنجو
          </span>

          <button
            onClick={handleAdd}
            className="
              px-4 py-2

              rounded-full
              bg-gradient-to-r from-pink-500 to-rose-400
              text-white

              text-[10px]
              tracking-[0.35em]
              uppercase

              shadow-[0_10px_25px_-10px_rgba(255,105,180,0.5)]

              hover:scale-105 active:scale-95
              transition
            "
          >
            أضف للسلة
          </button>

        </div>
      )}

    </div>
  </Link>
);
};

export default ProductCard;