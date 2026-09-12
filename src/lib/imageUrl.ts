const FLAMINGO_IMAGE_ZONE = "https://flamingoparkaden.com";

const getViewportAwareWidth = (requestedWidth: number) => {
  if (typeof window === "undefined") return requestedWidth;

  const viewportWidth = Math.max(320, window.innerWidth || requestedWidth);
  const devicePixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));

  // Large storefront images should scale with the real mobile viewport, but
  // small UI images (brand logos/category thumbs) must never be upscaled to a
  // blanket 480px minimum. Upscaling those wastes bandwidth without improving
  // perceived sharpness.
  if (viewportWidth < 768) {
    const mobileDpr = Math.min(devicePixelRatio, 2);
    const mobileTarget = Math.ceil(viewportWidth * mobileDpr);
    const capped = Math.min(requestedWidth, mobileTarget, 900);
    const mobileFloor = requestedWidth >= 480 ? 480 : Math.min(requestedWidth, 240);
    return Math.max(mobileFloor, capped);
  }

  if (requestedWidth >= 1200) {
    return Math.max(720, Math.min(requestedWidth, Math.ceil(viewportWidth * Math.min(devicePixelRatio, 2))));
  }

  if (requestedWidth >= 700) {
    const mediumDpr = Math.min(devicePixelRatio, 2);
    return Math.max(640, Math.min(requestedWidth, Math.ceil(viewportWidth * mediumDpr)));
  }

  return requestedWidth;
};

const isSupabasePublicStorageUrl = (url: URL) =>
  url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/v1/object/public/");

const getCloudflareOptions = (width: number, quality: number) => {
  const safeWidth = Math.max(240, Math.min(1920, Math.round(width)));
  const safeQuality = Math.max(60, Math.min(85, Math.round(quality)));
  return `width=${safeWidth},quality=${safeQuality},format=auto,fit=scale-down,metadata=none`;
};

const buildCloudflareImageUrl = (source: string, width: number, quality: number) =>
  `${FLAMINGO_IMAGE_ZONE}/cdn-cgi/image/${getCloudflareOptions(width, quality)}/${source}`;

const canTransformImage = (rawUrl: string | null | undefined) => {
  if (!rawUrl?.trim()) return false;

  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : FLAMINGO_IMAGE_ZONE;
    const url = new URL(rawUrl, baseUrl);

    return url.hostname.endsWith("unsplash.com") || isSupabasePublicStorageUrl(url);
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
      const colorVariantImage = u.pathname.includes("/uploads/color-variants/");

      if (viewportAware && colorVariantImage && width >= 1200) {
        optimizedWidth = Math.min(optimizedWidth, 640);
        optimizedQuality = Math.min(optimizedQuality, 82);
      }

      if (viewportAware && colorVariantImage && width >= 700 && width < 1200) {
        optimizedWidth = Math.min(optimizedWidth, 360);
        optimizedQuality = Math.min(optimizedQuality, 76);
      }

      return buildCloudflareImageUrl(u.toString(), optimizedWidth, optimizedQuality);
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

    const safeWidth = Math.max(240, Math.min(640, Math.round(width)));
    const safeQuality = Math.max(60, Math.min(85, Math.round(quality)));
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

  const requestedMax = candidates[candidates.length - 1];
  const viewportMax = getViewportAwareWidth(requestedMax);
  const limitedCandidates = candidates.filter((width) => width <= viewportMax);

  // Preserve a sharp final candidate close to the actual viewport need while
  // preventing mobile browsers from choosing desktop-sized 1200–1400px files.
  if (viewportMax < requestedMax && !limitedCandidates.includes(viewportMax)) {
    limitedCandidates.push(viewportMax);
  }

  const responsiveCandidates = Array.from(new Set(limitedCandidates)).sort((a, b) => a - b);

  return responsiveCandidates
    .map((width) => `${buildOptimizedImageUrl(url, width, quality, false)} ${width}w`)
    .join(", ");
};

const getCloudflareOriginalUrl = (src: string) => {
  const marker = "/cdn-cgi/image/";
  const markerIndex = src.indexOf(marker);
  if (markerIndex === -1) return null;

  const sourceStart = src.indexOf("/https://", markerIndex + marker.length);
  if (sourceStart === -1) return null;

  return src.slice(sourceStart + 1);
};

export const handleImageError = (event: { currentTarget: HTMLImageElement }) => {
  const image = event.currentTarget;

  if (image.dataset.fallbackApplied === "1") return;

  const cloudflareOriginal = getCloudflareOriginalUrl(image.src);
  if (cloudflareOriginal && image.dataset.originalTried !== "1") {
    image.dataset.originalTried = "1";
    image.removeAttribute("srcset");
    image.src = cloudflareOriginal;
    return;
  }

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
