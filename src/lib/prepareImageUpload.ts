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

const DEFAULT_MAX_SIZE_MB = 0.65;
const DEFAULT_MAX_DIMENSION = 1800;
const MIN_LONGEST_DIMENSION = 720;
const QUALITY_STEPS = [0.88, 0.82, 0.76, 0.7] as const;

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

    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }

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
    ) {
      return "image/png";
    }

    const ascii = (start: number, end: number) =>
      String.fromCharCode(...Array.from(bytes.slice(start, end)));

    if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
      return "image/webp";
    }

    if (bytes.length >= 12 && ascii(4, 8) === "ftyp") {
      const brands = ascii(8, Math.min(bytes.length, 64)).toLowerCase();
      if (brands.includes("avif") || brands.includes("avis")) return "image/avif";
      if (
        ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].some((brand) =>
          brands.includes(brand),
        )
      ) {
        return "image/heic";
      }
    }
  } catch (error) {
    console.warn("Image signature detection failed:", error);
  }

  return "";
}

function normalizeFile(file: File, mime: string): File {
  if (!mime || file.type === mime) return file;
  return new File([file], file.name, {
    type: mime,
    lastModified: file.lastModified || Date.now(),
  });
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

function drawScaledCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
) {
  const size = getScaledSize(sourceWidth, sourceHeight, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر تجهيز الصورة");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

async function imageElementToCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("انتهت مهلة قراءة الصورة")), 8000);

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

    return drawScaledCanvas(image, width, height, maxDimension);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function bitmapToCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);

  try {
    return drawScaledCanvas(bitmap, bitmap.width, bitmap.height, maxDimension);
  } finally {
    bitmap.close();
  }
}

function downscaleCanvas(source: HTMLCanvasElement, factor: number) {
  const next = document.createElement("canvas");
  next.width = Math.max(1, Math.round(source.width * factor));
  next.height = Math.max(1, Math.round(source.height * factor));

  const ctx = next.getContext("2d");
  if (!ctx) throw new Error("تعذر تجهيز الصورة");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, next.width, next.height);
  return next;
}

async function compressStandardImage(
  file: File,
  maxDimension: number,
  targetBytes: number,
): Promise<File> {
  let canvas: HTMLCanvasElement;

  try {
    canvas = await bitmapToCanvas(file, maxDimension);
  } catch (bitmapError) {
    console.warn("createImageBitmap compression path failed, trying HTMLImageElement:", bitmapError);
    canvas = await imageElementToCanvas(file, maxDimension);
  }

  let bestBlob: Blob | null = null;

  try {
    for (let round = 0; round < 5; round += 1) {
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToWebp(canvas, quality);

        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;

        if (blob.size <= targetBytes) {
          if (blob.size >= file.size && file.size <= targetBytes) return file;

          return new File([blob], `${createUploadId()}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });
        }
      }

      const longest = Math.max(canvas.width, canvas.height);
      if (longest <= MIN_LONGEST_DIMENSION) break;

      const nextCanvas = downscaleCanvas(canvas, 0.84);
      canvas.width = 1;
      canvas.height = 1;
      canvas = nextCanvas;
    }

    if (bestBlob && bestBlob.size < file.size) {
      return new File([bestBlob], `${createUploadId()}.webp`, {
        type: "image/webp",
        lastModified: Date.now(),
      });
    }

    if (file.size <= targetBytes) return file;

    throw new Error("تعذر ضغط الصورة إلى حجم مناسب. جرّب صورة أصغر.");
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}

async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const convertedBlob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    return new File([convertedBlob], `${createUploadId()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (heicToError) {
    console.warn("heic-to failed, trying heic2any:", heicToError);
  }

  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
    return new File([convertedBlob], `${createUploadId()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (heic2anyError) {
    console.error("HEIC conversion failed:", heic2anyError);
    throw new Error("تعذر تحويل صورة HEIC. جرّب تحويلها إلى JPG ثم أعد الرفع.");
  }
}

export async function prepareImageUpload(
  file: File,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<File> {
  const maxSizeMB = Math.max(0.2, opts.maxSizeMB ?? DEFAULT_MAX_SIZE_MB);
  const targetBytes = Math.round(maxSizeMB * 1024 * 1024);
  const maxDimension = Math.max(720, opts.maxWidthOrHeight ?? DEFAULT_MAX_DIMENSION);
  const declaredMime = inferImageMimeType(file);

  if (DIRECT_UPLOAD_MIMES.has(declaredMime)) {
    return compressStandardImage(file, maxDimension, targetBytes);
  }

  const sniffedMime = await sniffImageMimeType(file);
  const mime = sniffedMime || declaredMime;

  if (!mime) throw new Error("هذا الملف غير صالح كصورة قابلة للرفع");

  const normalizedFile = normalizeFile(file, mime);

  if (DIRECT_UPLOAD_MIMES.has(mime)) {
    return compressStandardImage(normalizedFile, maxDimension, targetBytes);
  }

  if (mime === "image/heic" || mime === "image/heif") {
    const converted = await convertHeicToJpeg(normalizedFile);
    return compressStandardImage(converted, maxDimension, targetBytes);
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
  if (["jpg", "jpeg", "png", "webp", "avif"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

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
    contentType: prepared.type || "image/webp",
  });

  if (uploadError) {
    const message = uploadError.message || "تعذر رفع الصورة إلى Supabase";

    if (/jwt|unauthorized|permission|row-level|rls/i.test(message)) {
      throw new Error("انتهت الجلسة أو لا توجد صلاحية للرفع. سجّل الدخول ثم حاول مرة أخرى");
    }

    throw new Error(message);
  }

  const elapsed =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;

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
