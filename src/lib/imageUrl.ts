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

export const optimizeImage = (url?: string | null, width = 800, quality = 82): string => {
  if (!url || !url.trim()) return "/placeholder.svg";

  try {
    const u = new URL(url, window.location.origin);
    let optimizedWidth = getViewportAwareWidth(width);
    let optimizedQuality = quality;

    if (u.hostname.endsWith("unsplash.com")) {
      u.searchParams.set("w", String(optimizedWidth));
      u.searchParams.set("q", String(optimizedQuality));
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "max");
      return u.toString();
    }

    if (u.hostname.endsWith("supabase.co") && u.pathname.includes("/storage/v1/object/public/")) {
      const colorVariantImage = u.pathname.includes("/uploads/color-variants/");

      // ProductDetailPage asks for 1400px, while ProductCard already loads 640px.
      // Reuse the exact 640/82 transformed URL so clicking a product can use the
      // browser cache immediately instead of starting another large image request.
      if (colorVariantImage && width >= 1200) {
        optimizedWidth = 640;
        optimizedQuality = 82;
      }

      // ProductDetailPage also preloads color images at 900px. Keep those light so
      // they cannot compete with the primary image on slower mobile connections.
      if (colorVariantImage && width >= 700 && width < 1200) {
        optimizedWidth = Math.min(optimizedWidth, 360);
        optimizedQuality = Math.min(optimizedQuality, 76);
      }

      u.pathname = u.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
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

export const createImageSrcSet = (
  url: string | null | undefined,
  widths: number[],
  quality = 82,
): string | undefined => {
  if (!url?.trim()) return undefined;

  const candidates = Array.from(new Set(widths.filter((width) => Number.isFinite(width) && width > 0)))
    .sort((a, b) => a - b);

  if (candidates.length === 0) return undefined;
  return candidates.map((width) => `${optimizeImage(url, width, quality)} ${width}w`).join(", ");
};

export const handleImageError = (event: { currentTarget: HTMLImageElement }) => {
  const image = event.currentTarget;

  if (image.dataset.fallbackApplied === "1") return;

  if (image.src.includes("/storage/v1/render/image/public/") && image.dataset.originalTried !== "1") {
    image.dataset.originalTried = "1";
    image.src = image.src.replace("/storage/v1/render/image/public/", "/storage/v1/object/public/").split("?")[0];
    return;
  }

  image.dataset.fallbackApplied = "1";
  image.src = "/placeholder.svg";
};
