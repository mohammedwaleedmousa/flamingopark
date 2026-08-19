import { heicTo } from "heic-to";
import { supabase } from "@/integrations/supabase/client";

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

const UPLOAD_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const DIRECT_UPLOAD_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function createUploadId(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

function inferImageMimeType(file: File): string {
  const declaredType = (file.type || "").toLowerCase();

  if (declaredType === "image/jpg" || declaredType === "image/pjpeg") return "image/jpeg";
  if (declaredType === "image/x-png") return "image/png";
  if (/^image\//.test(declaredType)) return declaredType;

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_MIME_BY_EXTENSION[extension] || "";
}

async function sniffImageMimeType(file: File): Promise<string> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());

    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) return "image/png";

    const ascii = (start: number, end: number) => String.fromCharCode(...Array.from(bytes.slice(start, end)));

    if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";

    if (bytes.length >= 12 && ascii(4, 8) === "ftyp") {
      const brands = ascii(8, Math.min(bytes.length, 64)).toLowerCase();
      if (brands.includes("avif") || brands.includes("avis")) return "image/avif";
      if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].some((brand) => brands.includes(brand))) return "image/heic";
    }
  } catch (error) {
    console.warn("Image signature detection failed:", error);
  }

  return "";
}

function normalizeFile(file: File, mime: string): File {
  if (!mime || file.type === mime) return file;
  return new File([file], file.name, { type: mime, lastModified: file.lastModified || Date.now() });
}

async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const convertedBlob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.94 });
    return new File([convertedBlob], `${createUploadId()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch (heicToError) {
    console.warn("heic-to failed, trying heic2any:", heicToError);
  }

  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.94 });
    const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
    return new File([convertedBlob], `${createUploadId()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch (heic2anyError) {
    console.error("HEIC conversion failed:", heic2anyError);
    throw new Error("تعذر تحويل صورة HEIC. جرّب تحويلها إلى JPG ثم أعد الرفع.");
  }
}

export async function prepareImageUpload(
  file: File,
  _opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<File> {
  const sniffedMime = await sniffImageMimeType(file);
  const inferredMime = inferImageMimeType(file);
  const mime = sniffedMime || inferredMime;

  if (!mime) throw new Error("هذا الملف غير صالح كصورة قابلة للرفع");

  const normalizedFile = normalizeFile(file, mime);

  if (DIRECT_UPLOAD_MIMES.has(mime)) return normalizedFile;

  if (mime === "image/heic" || mime === "image/heif") return convertHeicToJpeg(normalizedFile);

  throw new Error("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF أو HEIC.");
}

function sanitizeUploadPrefix(pathPrefix: string) {
  return pathPrefix
    .split("/")
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_-]/g, "-"))
    .filter(Boolean)
    .join("/");
}

function getUploadExtension(file: File) {
  const type = inferImageMimeType(file);
  if (UPLOAD_EXTENSION_BY_MIME[type]) return UPLOAD_EXTENSION_BY_MIME[type];

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "avif"].includes(extension)) return extension === "jpeg" ? "jpg" : extension;
  return "jpg";
}

export async function uploadPreparedImage(prepared: File, pathPrefix: string): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error("انتهت الجلسة. سجّل الدخول ثم حاول مرة أخرى");

  const prefix = sanitizeUploadPrefix(pathPrefix) || "images";
  const extension = getUploadExtension(prepared);
  const path = `${prefix}/${createUploadId()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("uploads").upload(path, prepared, {
    cacheControl: "31536000",
    upsert: false,
    contentType: prepared.type || "image/jpeg",
  });

  if (uploadError) throw new Error(uploadError.message || "تعذر رفع الصورة إلى Supabase");

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  if (!data.publicUrl) throw new Error("تم رفع الصورة ولكن تعذر إنشاء رابطها العام");

  return data.publicUrl;
}

export async function uploadOptimizedImage(
  file: File,
  pathPrefix: string,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<string> {
  const prepared = await prepareImageUpload(file, opts);
  return uploadPreparedImage(prepared, pathPrefix);
}
