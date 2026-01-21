export type ImageResizeMode = 'cover' | 'contain';

export type OptimizeImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
  resize?: ImageResizeMode;
};

/**
 * Returns an optimized URL for images stored in Lovable Cloud file storage.
 *
 * - If URL points to a public storage object, it is converted to the image rendering endpoint
 *   so we can request a smaller, compressed version (WebP) to speed up loading.
 * - External URLs (e.g. normal websites) are returned unchanged.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: OptimizeImageOptions = {}
): string {
  if (!url) return '';

  // Keep the existing Unsplash optimization behavior.
  if (url.includes('unsplash.com')) {
    const width = options.width ?? 800;
    const quality = options.quality ?? 80;
    const hasQuery = url.includes('?');
    const base = url
      .replace(/([?&])w=\d+/g, '$1w=' + width)
      .replace(/([?&])q=\d+/g, '$1q=' + quality);
    return hasQuery ? base : `${base}?w=${width}&q=${quality}`;
  }

  // Convert storage object public URLs into the render/image endpoint.
  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const u = new URL(url, baseOrigin);

    const isPublicObject = u.pathname.includes('/storage/v1/object/public/');
    const isRenderImage = u.pathname.includes('/storage/v1/render/image/public/');
    if (!isPublicObject && !isRenderImage) return url;

    if (isPublicObject) {
      u.pathname = u.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    }

    const {
      width,
      height,
      quality = 80,
      format = 'webp',
      resize,
    } = options;

    if (width) u.searchParams.set('width', String(width));
    if (height) u.searchParams.set('height', String(height));
    u.searchParams.set('quality', String(quality));
    u.searchParams.set('format', format);
    if (resize) u.searchParams.set('resize', resize);

    return u.toString();
  } catch {
    return url;
  }
}
