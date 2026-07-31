const SUPABASE_PUBLIC_UPLOADS = "/storage/v1/object/public/uploads/";
const SUPABASE_RENDER_UPLOADS = "/storage/v1/render/image/public/uploads/";

/** Uses Supabase Image Transformations only for this project's public uploads bucket. */
export const thumbnailUrl = (url: string, width = 480) => {
  const markerIndex = url.indexOf(SUPABASE_PUBLIC_UPLOADS);
  if (markerIndex === -1) return url;

  const origin = url.slice(0, markerIndex);
  const path = url.slice(markerIndex + SUPABASE_PUBLIC_UPLOADS.length);
  return `${origin}${SUPABASE_RENDER_UPLOADS}${path}?width=${width}&quality=65&format=webp`;
};
