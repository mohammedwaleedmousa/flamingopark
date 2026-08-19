const getViewportAwareWidth = (requestedWidth: number) => {
  if (typeof window === "undefined") return requestedWidth;

  const viewportWidth = Math.max(320, window.innerWidth || requestedWidth);
  const devicePixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));

  // صور التفاصيل الكبيرة لا تحتاج أن تكون أعرض من عدد البكسلات الفعلي
  // الذي تستطيع الشاشة إظهاره. نحافظ على 3x للشاشات عالية الكثافة.
  if (requestedWidth >= 1200) {
    return Math.max(720, Math.min(requestedWidth, Math.ceil(viewportWidth * devicePixelRatio)));
  }

  // الصور المتوسطة (مثل صور الألوان المسبقة) يكفيها حتى 2x على الهاتف.
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
    const optimizedWidth = getViewportAwareWidth(width);

    if (u.hostname.endsWith("unsplash.com")) {
      u.searchParams.set("w", String(optimizedWidth));
      u.searchParams.set("q", String(quality));
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "max");

      return u.toString();
    }

    if (u.hostname.endsWith("supabase.co") && u.pathname.includes("/storage/v1/object/public/")) {
      u.pathname = u.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
      u.searchParams.set("width", String(optimizedWidth));
      u.searchParams.set("quality", String(quality));
      u.searchParams.set("resize", "contain");

      return u.toString();
    }

    return url;
  } catch {
    return url;
  }
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
