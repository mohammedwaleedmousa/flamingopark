export const optimizeImage = (url?: string | null, width = 600, quality = 70): string => {
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

        return url;
    } catch {
        return url;
    }
};