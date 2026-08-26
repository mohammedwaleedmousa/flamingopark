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

const FAST_DIRECT_UPLOAD_BYTES = 900 * 1024;
const TARGET_UPLOAD_BYTES = 1.25 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2800;
const PRIMARY_WEBP_QUALITY = 0.93;
const SECONDARY_WEBP_QUALITY = 0.89;

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

function getScaledSize(width: number, height: number, maxDimension: number) {
  const longest = Math.max(width, height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("تعذر ضغط الصورة"))),
      "image/webp",
      quality,
    );
  });
}

async function imageElementToCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("انتهت مهلة قراءة الصورة")), 2500);

      image.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };

      image.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("تعذر قراءة الصورة"));
      };

      image.src = objectUrl;
    });

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error("أبعاد الصورة غير صالحة");

    const size = getScaledSize(width, height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, size.width, size.height);

    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function bitmapToCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);

  try {
    const size = getScaledSize(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);

    return canvas;
  } finally {
    bitmap.close();
  }
}

async function compressLargeStandardImage(file: File, maxDimension: number): Promise<File> {
  if (file.size <= FAST_DIRECT_UPLOAD_BYTES) return file;

  let canvas: HTMLCanvasElement;

  try {
    canvas = await bitmapToCanvas(file, maxDimension);
  } catch (bitmapError) {
    console.warn("createImageBitmap compression path failed, trying HTMLImageElement:", bitmapError);

    try {
      canvas = await imageElementToCanvas(file, maxDimension);
    } catch (imageError) {
      console.warn("Local image compression unavailable; uploading original image:", imageError);
      return file;
    }
  }

  try {
    let blob = await canvasToWebp(canvas, PRIMARY_WEBP_QUALITY);

    if (blob.size > TARGET_UPLOAD_BYTES * 1.25) {
      const smaller = await canvasToWebp(canvas, SECONDARY_WEBP_QUALITY);
      if (smaller.size < blob.size) blob = smaller;
    }

    if (blob.size >= file.size) return file;

    return new File([blob], `${createUploadId()}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (compressionError) {
    console.warn("WebP compression failed; uploading original image:", compressionError);
    return file;
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
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
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<File> {
  const declaredMime = inferImageMimeType(file);

  // أسرع مسار للصور القياسية: لا نقرأ حتى ترويسة الملف إذا كان المتصفح قد أعطانا MIME موثوقًا.
  if (DIRECT_UPLOAD_MIMES.has(declaredMime)) {
    return compressLargeStandardImage(file, opts.maxWidthOrHeight ?? DEFAULT_MAX_DIMENSION);
  }

  const sniffedMime = await sniffImageMimeType(file);
  const mime = sniffedMime || declaredMime;

  if (!mime) throw new Error("هذا الملف غير صالح كصورة قابلة للرفع");

  const normalizedFile = normalizeFile(file, mime);

  if (DIRECT_UPLOAD_MIMES.has(mime)) {
    return compressLargeStandardImage(normalizedFile, opts.maxWidthOrHeight ?? DEFAULT_MAX_DIMENSION);
  }

  if (mime === "image/heic" || mime === "image/heif") {
    const converted = await convertHeicToJpeg(normalizedFile);
    return compressLargeStandardImage(converted, opts.maxWidthOrHeight ?? DEFAULT_MAX_DIMENSION);
  }

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
  const prefix = sanitizeUploadPrefix(pathPrefix) || "images";
  const extension = getUploadExtension(prepared);
  const path = `${prefix}/${createUploadId()}.${extension}`;
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

  const { error: uploadError } = await supabase.storage.from("uploads").upload(path, prepared, {
    cacheControl: "31536000",
    upsert: false,
    contentType: prepared.type || "image/jpeg",
  });

  if (uploadError) {
    const message = uploadError.message || "تعذر رفع الصورة إلى Supabase";

    if (/jwt|unauthorized|permission|row-level|rls/i.test(message)) {
      throw new Error("انتهت الجلسة أو لا توجد صلاحية للرفع. سجّل الدخول ثم حاول مرة أخرى");
    }

    throw new Error(message);
  }

  const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
  console.info("SUPABASE IMAGE UPLOAD", {
    bytes: prepared.size,
    milliseconds: Math.round(elapsed),
    path,
  });

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
