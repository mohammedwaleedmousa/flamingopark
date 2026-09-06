const SUPABASE_IMAGE_TRANSFORMATIONS_ENABLED =
  String(import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORMATIONS || "").toLowerCase() === "true";

const getViewportAwareWidth = (requestedWidth: number) => {
  if (typeof window === "undefined") return requestedWidth;

  const viewportWidth = Math.max(320, window.innerWidth || requestedWidth);
  const devicePixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));

  if (requestedWidth >= 1200) {
    return Math.max(720, Math.min(requestedWidth, Math.ceil(viewportWidth * devicePixelRatio)));
  }

  if (requestedWidth >= 700) {
    const mediumDpr = Math.min(devicePixelRatio, 2);
    return Math.max(640, Math.min(requestedWidth, Math.ceil(viewportWidth * mediumDpr)));
  }

  return requestedWidth;
};

const isSupabasePublicStorageUrl = (url: URL) =>
  url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/v1/object/public/");

const canTransformImage = (rawUrl: string | null | undefined) => {
  if (!rawUrl?.trim()) return false;

  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://flamingoparkaden.com";
    const url = new URL(rawUrl, baseUrl);

    if (url.hostname.endsWith("unsplash.com")) return true;
    if (isSupabasePublicStorageUrl(url)) return SUPABASE_IMAGE_TRANSFORMATIONS_ENABLED;

    return false;
  } catch {
    return false;
  }
};

const buildOptimizedImageUrl = (
  url: string | null | undefined,
  width: number,
  quality: number,
  viewportAware: boolean,
): string => {
  if (!url || !url.trim()) return "/placeholder.svg";

  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://flamingoparkaden.com";
    const u = new URL(url, baseUrl);
    let optimizedWidth = viewportAware ? getViewportAwareWidth(width) : width;
    let optimizedQuality = quality;

    if (u.hostname.endsWith("unsplash.com")) {
      u.searchParams.set("w", String(optimizedWidth));
      u.searchParams.set("q", String(optimizedQuality));
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "max");
      return u.toString();
    }

    if (isSupabasePublicStorageUrl(u)) {
      // Flamingo currently runs on the Supabase Free plan, where Storage Image
      // Transformations are unavailable. Going straight to the original object
      // avoids a failed render/image request before the browser falls back.
      if (!SUPABASE_IMAGE_TRANSFORMATIONS_ENABLED) return url;

      const colorVariantImage = u.pathname.includes("/uploads/color-variants/");

      if (viewportAware && colorVariantImage && width >= 1200) {
        optimizedWidth = 640;
        optimizedQuality = 82;
      }

      if (viewportAware && colorVariantImage && width >= 700 && width < 1200) {
        optimizedWidth = Math.min(optimizedWidth, 360);
        optimizedQuality = Math.min(optimizedQuality, 76);
      }

      u.pathname = u.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/",
      );
      u.searchParams.set("width", String(optimizedWidth));
      u.searchParams.set("quality", String(optimizedQuality));
      u.searchParams.set("resize", "contain");
      return u.toString();
    }

    return url;
  } catch {
    return url;
  }
};

export const optimizeImage = (url?: string | null, width = 800, quality = 82): string =>
  buildOptimizedImageUrl(url, width, quality, true);

export const createImageSrcSet = (
  url: string | null | undefined,
  widths: number[],
  quality = 82,
): string | undefined => {
  if (!url?.trim() || !canTransformImage(url)) return undefined;

  const candidates = Array.from(
    new Set(widths.filter((width) => Number.isFinite(width) && width > 0)),
  ).sort((a, b) => a - b);

  if (candidates.length === 0) return undefined;

  return candidates
    .map((width) => `${buildOptimizedImageUrl(url, width, quality, false)} ${width}w`)
    .join(", ");
};

export const handleImageError = (event: { currentTarget: HTMLImageElement }) => {
  const image = event.currentTarget;

  if (image.dataset.fallbackApplied === "1") return;

  if (
    image.src.includes("/storage/v1/render/image/public/") &&
    image.dataset.originalTried !== "1"
  ) {
    image.dataset.originalTried = "1";
    image.removeAttribute("srcset");
    image.src = image.src
      .replace("/storage/v1/render/image/public/", "/storage/v1/object/public/")
      .split("?")[0];
    return;
  }

  image.dataset.fallbackApplied = "1";
  image.removeAttribute("srcset");
  image.src = "/placeholder.svg";
};
