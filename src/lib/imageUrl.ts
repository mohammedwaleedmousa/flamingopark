const SUPABASE_IMAGE_TRANSFORMATIONS_ENABLED =
  String(import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORMATIONS || "").toLowerCase() === "true";

const FLAMINGO_IMAGE_ZONE = "https://flamingoparkaden.com";

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
    const baseUrl = typeof window !== "undefined" ? window.location.origin : FLAMINGO_IMAGE_ZONE;
    const url = new URL(rawUrl, baseUrl);

    if (url.hostname.endsWith("unsplash.com")) return true;
    if (isSupabasePublicStorageUrl(url)) return true;

    return false;
  } catch {
    return false;
  }
};

const buildCloudflareImageUrl = (sourceUrl: string, width: number, quality: number) => {
  const safeWidth = Math.max(160, Math.min(1800, Math.round(width)));
  const safeQuality = Math.max(60, Math.min(88, Math.round(quality)));
  const options = `width=${safeWidth},quality=${safeQuality},format=auto,fit=scale-down,metadata=none`;
  return `${FLAMINGO_IMAGE_ZONE}/cdn-cgi/image/${options}/${sourceUrl}`;
};

const buildOptimizedImageUrl = (
  url: string | null | undefined,
  width: number,
  quality: number,
  viewportAware: boolean,
): string => {
  if (!url || !url.trim()) return "/placeholder.svg";

  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : FLAMINGO_IMAGE_ZONE;
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
      if (!SUPABASE_IMAGE_TRANSFORMATIONS_ENABLED) {
        return buildCloudflareImageUrl(u.toString(), optimizedWidth, optimizedQuality);
      }

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

export const optimizeCatalogImage = (
  url?: string | null,
  width = 480,
  quality = 78,
): string => {
  if (!url?.trim()) return "/placeholder.svg";

  try {
    const parsed = new URL(url, FLAMINGO_IMAGE_ZONE);
    if (!isSupabasePublicStorageUrl(parsed)) return optimizeImage(url, width, quality);

    const isMobile = typeof window !== "undefined" && window.innerWidth <= 767;
    const mobileWidth = isMobile ? Math.min(width, 360) : width;
    const safeWidth = Math.max(240, Math.min(640, Math.round(mobileWidth)));
    const safeQuality = Math.max(60, Math.min(85, Math.round(isMobile ? Math.min(quality, 74) : quality)));
    return buildCloudflareImageUrl(parsed.toString(), safeWidth, safeQuality);
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

  if (image.src.includes("/cdn-cgi/image/") && image.dataset.originalTried !== "1") {
    image.dataset.originalTried = "1";
    image.removeAttribute("srcset");
    try {
      const marker = image.src.indexOf("/https://");
      if (marker !== -1) {
        image.src = image.src.slice(marker + 1);
        return;
      }
    } catch {
      // Continue to placeholder fallback below.
    }
  }

  image.dataset.fallbackApplied = "1";
  image.removeAttribute("srcset");
  image.src = "/placeholder.svg";
};
