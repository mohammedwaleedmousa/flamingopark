import heic2any from "heic2any";
import imageCompression from "browser-image-compression";

/**
 * Convert HEIC/HEIF (iPhone) to JPEG when needed, then compress to WebP.
 * Accepts any browser-supported image format.
 */
export async function prepareImageUpload(
  file: File,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {}
): Promise<File> {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const isHEIC =
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  let working: File | Blob = file;

  if (isHEIC) {
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    working = new File([blob], `${crypto.randomUUID()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  const compressed = await imageCompression(working as File, {
    maxSizeMB: opts.maxSizeMB ?? 1,
    maxWidthOrHeight: opts.maxWidthOrHeight ?? 1600,
    useWebWorker: true,
    fileType: "image/webp",
  });

  return new File(
    [compressed],
    `${crypto.randomUUID()}.webp`,
    { type: "image/webp", lastModified: Date.now() }
  );
}