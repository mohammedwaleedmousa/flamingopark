import { memo, useEffect, useMemo, useState } from "react";
import type { MouseEvent, SyntheticEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, ImageOff, ShoppingBag } from "lucide-react";

import { Product, useStore } from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";
import { useFavorites } from "@/hooks/useFavorites";
import { saveCatalogScroll } from "@/lib/catalogScroll";
import { optimizeImage } from "@/lib/imageUrl";
import { prefetchProductDetailPage } from "@/lib/prefetchRoutes";

type ColorVariant = {
  name?: string;
  hex?: string;
  hex2?: string;
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
  onQuickView?: (product: DisplayProduct) => void;
}

type ImageFit = "cover" | "contain";

const isHeicImage = (url: string) => {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return cleanUrl.endsWith(".heic") || cleanUrl.endsWith(".heif");
};

const ProductCard = ({ product, index = 2, badge, onQuickView }: ProductCardProps) => {
  const location = useLocation();

  // Subscribe each card only to the tiny pieces of state it actually needs.
  // This prevents every product card from re-rendering when the cart/favorites change.
  const isLiked = useFavorites((state) => state.favorites.some((favorite) => favorite.id === product.id));
  const toggleFavorite = useFavorites((state) => state.toggleFavorite);
  const addToCart = useStore((state) => state.addToCart);
  const openCart = useStore((state) => state.openCart);
  const { format } = useCurrency();

  const [bagPop, setBagPop] = useState(false);
  const [heartBeat, setHeartBeat] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [allImagesFailed, setAllImagesFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFit, setImageFit] = useState<ImageFit>("cover");

  const colors = useMemo<ColorVariant[]>(() => product.colorVariants || product.color_variants || [], [product.colorVariants, product.color_variants]);

  const imageCandidates = useMemo(() => {
    const variantImages = colors.flatMap((color) => (Array.isArray(color.images) ? color.images : []));
    const productImages = Array.isArray(product.images) ? product.images : [];
    const uniqueImages = Array.from(new Set([...variantImages, ...productImages].filter((image): image is string => typeof image === "string" && image.trim().length > 0)));
    const normalImages = uniqueImages.filter((image) => !isHeicImage(image));
    const heicImages = uniqueImages.filter((image) => isHeicImage(image));
    return [...normalImages, ...heicImages];
  }, [colors, product.images]);

  const primaryColor = useMemo(() => colors.find((color) => Array.isArray(color.images) && color.images.some((image) => typeof image === "string" && image.trim().length > 0)) || colors[0], [colors]);
  const firstColorName = primaryColor?.name;
  const mainImage = imageCandidates[imageIndex];

  // Keep the exact same image transformation quality. The speed gain comes from
  // loading fewer off-screen images, not from compressing them harder.
  const optimizedMainImage = useMemo(() => (mainImage ? optimizeImage(mainImage, 520, 76) : ""), [mainImage]);

  useEffect(() => {
    setImageIndex(0);
    setAllImagesFailed(false);
    setImageLoaded(false);
    setImageFit("cover");
  }, [product.id]);

  useEffect(() => {
    setImageLoaded(false);
    setImageFit("cover");
  }, [imageIndex]);

  const handleMainImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (!width || !height) {
      setImageFit("cover");
      setImageLoaded(true);
      return;
    }

    const imageRatio = width / height;
    setImageFit(imageRatio >= 0.68 && imageRatio <= 1.05 ? "cover" : "contain");
    setImageLoaded(true);
  };

  const handleMainImageError = (_event: SyntheticEvent<HTMLImageElement>) => {
    if (imageIndex < imageCandidates.length - 1) {
      setImageIndex((current) => current + 1);
      return;
    }

    setAllImagesFailed(true);
    setImageLoaded(true);
  };

  const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const nowLiked = toggleFavorite(product);
    setHeartBeat(true);
    window.setTimeout(() => setHeartBeat(false), 260);
    toast({ title: nowLiked ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة" });
  };

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const variants = product.variants;
    if (variants?.length && onQuickView) {
      onQuickView(product);
      return;
    }

    addToCart(product, 1);
    setBagPop(true);
    window.setTimeout(() => setBagPop(false), 280);
    toast({ title: "تمت الإضافة إلى السلة" });
    openCart();
  };

  const getDisplayedPrice = () => {
    const variants = product.variants;
    if (!variants?.length) return format(product.price);

    const prices = variants.map((variant) => variant.price ?? product.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice ? format(minPrice) : `${format(minPrice)} - ${format(maxPrice)}`;
  };

  const discount = Number(product.discount || 0);
  const cardBadge = badge || (discount > 0 ? `-${discount}%` : undefined);

  return (
    <Link to={`/product/${product.slug}`} dir="rtl" onPointerEnter={() => void prefetchProductDetailPage()} onPointerDown={() => void prefetchProductDetailPage()} onFocus={() => void prefetchProductDetailPage()} onClick={() => saveCatalogScroll(`${location.pathname}${location.search}`)} className="block w-full min-w-0">
      <article className="relative w-full min-w-0 overflow-hidden rounded-[15px] border border-[#EEE6E2] bg-white transition-transform duration-150 active:scale-[0.985]">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F1F0EE]">
          {!allImagesFailed && optimizedMainImage ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 z-[2] animate-pulse bg-[#ECEAE8]" />}
              <img key={`${product.id}-${imageIndex}-${mainImage}`} src={optimizedMainImage} alt={product.nameAr || product.name || "منتج فلامنجو"} loading={index < 2 ? "eager" : "lazy"} decoding="async" fetchPriority={index === 0 ? "high" : "auto"} onLoad={handleMainImageLoad} onError={handleMainImageError} width={520} height={650} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className={`absolute inset-0 h-full w-full select-none transition-opacity duration-150 ${imageLoaded ? "opacity-100" : "opacity-0"} ${imageFit === "cover" ? "object-cover object-center" : "scale-[1.035] object-contain object-center"}`} />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F1F0EE]">
              <ImageOff className="h-6 w-6 text-[#B8ACA7]" strokeWidth={1.3} />
              <span className="mt-2 text-[8px] text-[#A79A95]">الصورة غير متوفرة</span>
            </div>
          )}

          <button type="button" aria-label={isLiked ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} onClick={handleFavorite} className={`absolute left-2 top-2 z-20 flex h-[31px] w-[31px] items-center justify-center rounded-full border border-white/70 bg-white/95 shadow-[0_2px_8px_rgba(45,35,30,0.07)] transition-transform duration-200 ${heartBeat ? "scale-110" : "scale-100"}`}>
            <Heart className={`h-[15px] w-[15px] transition-colors ${isLiked ? "fill-[#D4777D] text-[#D4777D]" : "fill-transparent text-[#766B67]"}`} strokeWidth={1.6} />
          </button>

          {cardBadge && <span className="absolute right-2 top-2 z-20 flex h-[23px] min-w-[39px] items-center justify-center rounded-[7px] bg-[#D4777D] px-2 text-[8px] font-semibold leading-none text-white">{cardBadge}</span>}

          {colors.length > 0 && (
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-[4px] rounded-full bg-white/90 px-1.5 py-1 shadow-[0_2px_8px_rgba(45,35,30,0.06)]">
              {colors.slice(0, 4).map((color, colorIndex) => (
                <span key={`${color.name || "color"}-${colorIndex}`} title={color.name} className={`${colorIndex === 0 ? "h-[13px] w-[13px]" : "h-[11px] w-[11px]"} block shrink-0 rounded-full border border-white shadow-[0_0_0_1px_rgba(50,40,35,0.10)]`} style={color.hex2 ? { background: `linear-gradient(135deg, ${color.hex || "#e2e2e2"} 0%, ${color.hex || "#e2e2e2"} 50%, ${color.hex2} 50%, ${color.hex2} 100%)` } : { backgroundColor: color.hex || "#e2e2e2" }} />
              ))}
              {colors.length > 4 && <span className="mr-0.5 text-[6px] font-medium text-[#81746F]">+{colors.length - 4}</span>}
            </div>
          )}
        </div>

        <div className="relative h-[86px] bg-white px-[10px] pb-[9px] pt-[8px]">
          <h3 className="overflow-hidden whitespace-nowrap pl-[36px] text-ellipsis text-[10.5px] font-semibold leading-[17px] text-[#3E3431]">{product.nameAr || product.name}</h3>
          <p className="mt-[1px] overflow-hidden whitespace-nowrap pl-[36px] text-ellipsis text-[7.5px] leading-[14px] text-[#9E918C]">
            {product.brand || "Flamingo Park"}
            {firstColorName && <><span className="mx-[4px] text-[#D1C7C3]">•</span>{firstColorName}</>}
          </p>

          <div className="absolute bottom-[13px] left-[46px] right-[10px] flex min-w-0 items-center">
            <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold leading-none text-[#B86168]">{getDisplayedPrice()}</span>
          </div>

          {product.inStock ? (
            <button type="button" aria-label="إضافة إلى السلة" onClick={handleAdd} className={`absolute bottom-[9px] left-[9px] flex h-[33px] w-[33px] items-center justify-center rounded-[9px] border border-[#E9CFCC] bg-[#FFF7F5] text-[#B86168] transition-all duration-200 active:bg-[#FAECE9] ${bagPop ? "scale-110" : "scale-100"}`}>
              <ShoppingBag className="h-[15px] w-[15px]" strokeWidth={1.7} />
            </button>
          ) : (
            <span className="absolute bottom-[14px] left-[9px] text-[7px] font-medium text-[#A89C97]">نفدت الكمية</span>
          )}
        </div>
      </article>
    </Link>
  );
};

export default memo(ProductCard);
