import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";

import { Product, useStore } from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";
import { useFavorites } from "@/hooks/useFavorites";
import { saveCatalogScroll } from "@/lib/catalogScroll";
import { optimizeImage, handleImageError } from "@/lib/imageUrl";

type ColorVariant = {
  name?: string;
  hex?: string;
  images?: string[];
};

type DisplayProduct = Product & {
  colorVariants?: ColorVariant[];
  color_variants?: ColorVariant[];
  rating?: number;
};

interface ProductCardProps {
  product: DisplayProduct;
  index?: number;
  badge?: string;
  size?: "large" | "medium" | "small";
  onQuickView?: (p: DisplayProduct) => void;
}

const ProductCard = ({
  product,
  badge,
  onQuickView,
}: ProductCardProps) => {
  const location = useLocation();

  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart, openCart } = useStore();
  const { format } = useCurrency();

  const [bagPop, setBagPop] = useState(false);
  const [heartBeat, setHeartBeat] = useState(false);

  const isLiked = isFavorite(product.id);

  const colors =
    product.colorVariants ||
    product.color_variants ||
    [];

  const getProductImage = () => {
    const firstVariantImage =
      colors?.[0]?.images?.[0];

    if (firstVariantImage) {
      return firstVariantImage;
    }

    if (product.images?.length) {
      return product.images[0];
    }

    return "/placeholder.svg";
  };

  const mainImage = getProductImage();

  const handleFavorite = (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const nowLiked = toggleFavorite(product);

    setHeartBeat(true);

    window.setTimeout(() => {
      setHeartBeat(false);
    }, 320);

    toast({
      title: nowLiked
        ? "تمت الإضافة للمفضلة"
        : "تمت الإزالة من المفضلة",
    });
  };

  const handleAdd = (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const variants = product.variants;

    if (
      variants &&
      variants.length > 0 &&
      onQuickView
    ) {
      onQuickView(product);
      return;
    }

    addToCart(product, 1);

    setBagPop(true);

    window.setTimeout(() => {
      setBagPop(false);
    }, 350);

    toast({
      title: "تمت الإضافة إلى السلة",
    });

    openCart();
  };

  const getDisplayedPrice = () => {
    const variants = product.variants;

    if (!variants?.length) {
      return format(product.price);
    }

    const prices = variants.map((variant) => {
      return variant.price ?? product.price;
    });

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return format(minPrice);
    }

    return `${format(minPrice)} - ${format(maxPrice)}`;
  };

  const discount = Number(product.discount || 0);

  const cardBadge =
    badge ||
    (discount > 0
      ? `-${discount}%`
      : undefined);

  const firstColorName =
    colors?.[0]?.name;

  return (
    <Link
      to={`/product/${product.slug}`}
      dir="rtl"
      onClick={() =>
        saveCatalogScroll(
          `${location.pathname}${location.search}`,
        )
      }
      className="block w-full min-w-0"
    >
      <article
        className="
          relative
          w-full
          min-w-0
          overflow-hidden

          rounded-[20px]

          bg-white

          shadow-[0_7px_22px_rgba(45,30,37,0.07)]

          transition-transform
          duration-200

          active:scale-[0.985]
        "
      >
        {/* IMAGE */}
        <div
          className="
            relative
            w-full
            aspect-[1/1.12]
            overflow-hidden
            bg-[#f3f2f0]
          "
        >
          <img
            src={optimizeImage(
              mainImage,
              700,
              90,
            )}
            alt={product.nameAr}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            width={700}
            height={780}
            sizes="
              (max-width: 640px) 50vw,
              (max-width: 1024px) 33vw,
              25vw
            "
            className="
              absolute
              inset-0

              w-full
              h-full

              object-cover

              [object-position:center_68%]
            "
          />

          {/* FAVORITE */}
          <motion.button
            type="button"
            aria-label={
              isLiked
                ? "إزالة من المفضلة"
                : "إضافة إلى المفضلة"
            }
            onClick={handleFavorite}
            whileTap={{ scale: 0.84 }}
            animate={
              heartBeat
                ? {
                    scale: [1, 1.18, 0.96, 1],
                  }
                : {
                    scale: 1,
                  }
            }
            transition={{
              duration: 0.3,
            }}
            className="
              absolute
              z-30

              top-[9px]
              left-[9px]

              w-[34px]
              h-[34px]

              rounded-full

              bg-white/95

              flex
              items-center
              justify-center

              shadow-[0_4px_12px_rgba(0,0,0,0.09)]
            "
          >
            <Heart
              strokeWidth={1.8}
              className={`
                w-[17px]
                h-[17px]

                ${
                  isLiked
                    ? "text-[#ff526f] fill-[#ff526f]"
                    : "text-[#8f9297] fill-transparent"
                }
              `}
            />
          </motion.button>

          {/* BADGE */}
          {cardBadge && (
            <span
              className="
                absolute
                z-30

                top-[9px]
                right-[9px]

                min-w-[43px]
                h-[25px]

                px-[9px]

                rounded-[9px]

                flex
                items-center
                justify-center

                bg-[#ff526f]

                text-white
                text-[10px]
                font-semibold
                leading-none

                shadow-[0_4px_12px_rgba(255,82,111,0.16)]
              "
            >
              {cardBadge}
            </span>
          )}

          {/* COLORS */}
          {colors.length > 0 && (
            <div
              className="
                absolute
                z-30

                right-[10px]
                bottom-[9px]

                flex
                items-center
                gap-[4px]
              "
            >
              {colors
                .slice(0, 4)
                .map((color, index) => (
                  <span
                    key={`${color.name || "color"}-${index}`}
                    title={color.name}
                    className={`
                      block
                      shrink-0

                      rounded-full

                      border-[1.5px]
                      border-white

                      shadow-[0_1px_5px_rgba(0,0,0,0.18)]

                      ${
                        index === 0
                          ? "w-[15px] h-[15px]"
                          : "w-[12px] h-[12px]"
                      }
                    `}
                    style={{
                      backgroundColor:
                        color.hex || "#e2e2e2",
                    }}
                  />
                ))}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div
          className="
            relative

            h-[90px]

            bg-white

            px-[11px]
            pt-[9px]
            pb-[9px]
          "
        >
          <h3
            className="
              pl-[38px]

              overflow-hidden
              whitespace-nowrap
              text-ellipsis

              text-[#30292c]
              text-[12px]
              font-semibold

              leading-[18px]
            "
          >
            {product.nameAr}
          </h3>

          <p
            className="
              mt-[1px]

              pl-[38px]

              overflow-hidden
              whitespace-nowrap
              text-ellipsis

              text-[#aaa4a7]
              text-[9.5px]

              leading-[16px]
            "
          >
            {product.brand || "فلامنجو"}

            {firstColorName && (
              <>
                <span className="mx-[4px] text-[#cac5c7]">
                  •
                </span>

                {firstColorName}
              </>
            )}
          </p>

          {/* PRICE */}
          <div
            className="
              absolute

              right-[11px]
              left-[50px]
              bottom-[14px]

              min-w-0

              flex
              items-center
            "
          >
            <span
              className="
                block
                max-w-full

                overflow-hidden
                whitespace-nowrap
                text-ellipsis

                text-[#ff526f]
                text-[13px]
                font-bold

                leading-none
              "
            >
              {getDisplayedPrice()}
            </span>
          </div>

          {/* CART */}
          {product.inStock ? (
            <motion.button
              type="button"
              aria-label="إضافة إلى السلة"
              onClick={handleAdd}
              whileTap={{
                scale: 0.84,
              }}
              animate={
                bagPop
                  ? {
                      scale: [
                        1,
                        1.13,
                        0.96,
                        1,
                      ],
                    }
                  : {
                      scale: 1,
                    }
              }
              transition={{
                duration: 0.34,
              }}
              className="
                absolute

                left-[10px]
                bottom-[10px]

                w-[36px]
                h-[36px]

                rounded-[11px]

                flex
                items-center
                justify-center

                bg-[#fff0f3]
                text-[#ff526f]

                border
                border-[#ffdde4]

                shadow-[0_3px_8px_rgba(255,82,111,0.05)]
              "
            >
              <ShoppingBag
                strokeWidth={1.9}
                className="w-[17px] h-[17px]"
              />
            </motion.button>
          ) : (
            <span
              className="
                absolute

                left-[10px]
                bottom-[15px]

                text-[9px]
                font-medium

                text-[#aaa4a7]
              "
            >
              نفدت الكمية
            </span>
          )}
        </div>
      </article>
    </Link>
  );
};

export default ProductCard;