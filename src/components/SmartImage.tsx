import type { ImgHTMLAttributes } from "react";
import { handleImageError, optimizeImage } from "@/lib/imageUrl";

type SmartImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  width?: number;
  quality?: number;
  responsiveWidths?: number[];
};

const canTransform = (url?: string | null) => {
  if (!url) return false;
  try {
    const hostname = new URL(url, window.location.origin).hostname;
    return hostname.endsWith("supabase.co") || hostname.endsWith("unsplash.com");
  } catch {
    return false;
  }
};

export default function SmartImage({ src, width = 800, quality = 82, responsiveWidths, loading = "lazy", decoding = "async", onError, ...props }: SmartImageProps) {
  const source = src || "/placeholder.svg";
  const widths = responsiveWidths?.filter((value, index, values) => value > 0 && values.indexOf(value) === index).sort((a, b) => a - b);
  const srcSet = canTransform(source) && widths?.length ? widths.map((value) => `${optimizeImage(source, value, quality)} ${value}w`).join(", ") : undefined;

  return <img {...props} src={optimizeImage(source, width, quality)} srcSet={srcSet} loading={loading} decoding={decoding} onError={(event) => { handleImageError(event); onError?.(event); }} />;
}
