type ProductImageSource = {
    images?: unknown;
    colorVariants?: Array<{ images?: unknown }> | null;
    color_variants?: Array<{ images?: unknown }> | null;
    qualityVariants?: Array<{ images?: unknown }> | null;
    quality_variants?: Array<{ images?: unknown }> | null;
};

/** روابط blob/data صالحة للمعاينة المحلية فقط، ولا يجوز عرضها أو حفظها كصور منتجات. */
export const isUsableImageUrl = (value: unknown): value is string => {
    if (typeof value !== "string") return false;
    const url = value.trim();
    if (!url || url.startsWith("blob:") || url.startsWith("data:")) return false;
    return /^https?:\/\//i.test(url) || url.startsWith("/");
};

export const filterUsableImageUrls = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values.filter(isUsableImageUrl).map((url) => url.trim())));
};

/** يجمع كل الصور السليمة، فلا تختفي البطاقة لمجرد أن صورة أول لون تالفة. */
export const collectProductImageUrls = (product: ProductImageSource): string[] => {
    const colorVariants = product.colorVariants || product.color_variants || [];
    const qualityVariants = product.qualityVariants || product.quality_variants || [];

    return filterUsableImageUrls([
        ...filterUsableImageUrls(product.images),
        ...colorVariants.flatMap((variant) => filterUsableImageUrls(variant?.images)),
        ...qualityVariants.flatMap((variant) => filterUsableImageUrls(variant?.images)),
    ]);
};

export const firstProductImage = (product: ProductImageSource): string =>
    collectProductImageUrls(product)[0] || "/placeholder.svg";

export const optimizeImage = (url?: string | null, width = 800, quality = 88): string => {
    if (!isUsableImageUrl(url)) return "/placeholder.svg";

    try {
        const baseUrl = typeof window === "undefined" ? "https://flamingoparkaden.com" : window.location.origin;
        const u = new URL(url, baseUrl);

        if (u.hostname.endsWith("unsplash.com")) {
            u.searchParams.set("w", String(width));
            u.searchParams.set("q", String(quality));
            u.searchParams.set("auto", "format");
            u.searchParams.set("fit", "crop");
            return u.toString();
        }

        if (u.hostname.endsWith("supabase.co") && u.pathname.includes("/storage/v1/object/public/")) {
            u.pathname = u.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
            u.searchParams.set("width", String(width));
            u.searchParams.set("quality", String(quality));
            u.searchParams.set("resize", "cover");
            return u.toString();
        }

        return url;
    } catch {
        return url;
    }
};

/** يستبدل الصور التي تفشل في التحميل بصورة بديلة بدل الإطار الفارغ. */
export const handleImageError = (event: { currentTarget: HTMLImageElement }) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === "1") return;

    // لا تدع المتصفح يعيد اختيار نسخة فاشلة من srcset بعد تطبيق الرابط البديل.
    image.removeAttribute("srcset");

    // إن كان الرابط عبر محول الصور، أعد المحاولة بالرابط الأصلي قبل الصورة البديلة.
    if (image.src.includes("/storage/v1/render/image/public/") && image.dataset.originalTried !== "1") {
        image.dataset.originalTried = "1";
        image.src = image.src
            .replace("/storage/v1/render/image/public/", "/storage/v1/object/public/")
            .split("?")[0];
        return;
    }

    image.dataset.fallbackApplied = "1";
    image.src = "/placeholder.svg";
};
