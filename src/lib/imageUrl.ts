export const optimizeImage = (url?: string | null, width = 800, quality = 88): string => {
    if (!url || !url.trim()) return "/placeholder.svg";

    try {
        const u = new URL(url, window.location.origin);

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