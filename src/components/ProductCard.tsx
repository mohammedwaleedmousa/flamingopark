import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Product, useStore } from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart, ShoppingBag } from "lucide-react";

interface ProductCardProps {
  product: Product;
  index?: number;
  badge?: "NEW IN" | "LIMITED" | "BEST SELLER" | "HOT" | null;
  size?: "large" | "medium" | "small";
  onQuickView?: (p: Product) => void;
}

const ProductCard = ({ product, badge, size = 'small', onQuickView }: ProductCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart, openCart } = useStore();
  const { format } = useCurrency();
  const [bagPop, setBagPop] = useState(false);
  const [heartBeat, setHeartBeat] = useState(false);
  const isLiked = isFavorite(product.id);

  const handleFavorite = (e: React.MouseEvent) => {
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

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // If product has variants, open quick view to choose color/size
    const variants = (product as any).variants as any[] | undefined;
    if (variants && variants.length > 0) {
      onQuickView?.(product);
      return;
    }
    addToCart(product, 1);
    setBagPop(true);
    setTimeout(() => setBagPop(false), 400);
    toast({ title: "تمت الإضافة إلى السلة" });
    openCart();
  };

  const aspectClass = size === 'large' ? 'aspect-[4/5] sm:aspect-[3/4]' : size === 'medium' ? 'aspect-[3/5] sm:aspect-[3/4]' : 'aspect-[4/8] sm:aspect-[3/4]';

  return (
    <Link to={`/product/${product.slug}`} className="group block" dir="rtl">

      <div
        className={`relative ${aspectClass}
          bg-white
          border border-pink-100/10
          rounded-[20px]
          overflow-hidden
          flex flex-col

          transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
          hover:-translate-y-1 hover:shadow-2xl
        `}
      >

      {/* IMAGE FULL AREA */}
      <div className="relative flex-1 overflow-hidden bg-neutral-100 ">

        <img
          src={product.images?.[0]}
          alt={product.nameAr}
          loading="lazy"
          className="
            w-full h-full object-cover
            transition duration-700 ease-out
            group-hover:scale-105
          "
        />
        {/* quick-action buttons */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            onClick={(e) => { handleFavorite(e); }}
            whileTap={{ scale: 0.9 }}
            animate={heartBeat ? { scale: [1, 1.22, 1] } : { scale: 1 }}
            whileHover={{ scale: 1.06 }}
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-neutral-600'}`} />
          </motion.button>
        </div>

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

          <p className="text-[10px] tracking-[0.08em] uppercase text-pink-400">
            {product.brand}
          </p>

          <span className="text-[11px] text-neutral-500 flex items-center gap-1">
            <span className="text-pink-400">★</span>
            {(product as any).rating ? Number((product as any).rating).toFixed(1) : "4.5"}
          </span>

        </div>

        <h3 className="text-sm font-medium text-neutral-900 line-clamp-2">
          {product.nameAr}
        </h3>

        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-black">
            {(() => {
              const variants = (product as any).variants as any[] | undefined;
              if (!variants || variants.length === 0) return format(finalPrice);
              const prices = variants.map((v) => {
                const p = v.price ?? product.price; const d = v.discount ?? product.discount ?? 0; return p * (1 - d / 100);
              });
              const minP = Math.min(...prices); const maxP = Math.max(...prices);
              return minP === maxP ? format(minP) : `${format(minP)} - ${format(maxP)}`;
            })()}
          </div>
        </div>

        {/* swatches */}
        {(product as any).variants && (product as any).variants.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            {((product as any).variants as any[]).slice(0,4).map((v: any) => (
              <div key={v.id} title={v.colorName} className="w-6 h-6 rounded-full border" style={{ background: v.colorHex || '#eee' }} />
            ))}
          </div>
        )}

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
            tracking-[0.02em]
            uppercase
            text-neutral-500
          ">
            فلامنجو
          </span>

          <motion.button
            onClick={handleAdd}
            animate={bagPop ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
            whileTap={{ scale: 0.96 }}
            className="
              w-10 h-10

              rounded-full
              bg-gradient-to-r from-pink-500 to-rose-400
              text-white

              flex items-center justify-center

              shadow-[0_10px_25px_-10px_rgba(255,105,180,0.5)]

              transition
            "
          >
            <ShoppingBag className="w-5 h-5" />
          </motion.button>

        </div>
      )}

    </div>
  </Link>
);
};

export default ProductCard;