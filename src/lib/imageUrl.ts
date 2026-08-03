export const optimizeImage = (url?: string | null, width = 720, quality = 82): string => {
    if (!url) return "/placeholder.svg";

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
            u.searchParams.set("resize", "contain");
            return u.toString();
        }

        return url;
    } catch {
        return url;
    }
};