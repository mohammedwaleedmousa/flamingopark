import { heicTo, isHeic } from "heic-to";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function inferImageMimeType(file: File): string {
  const declaredType = (file.type || "").toLowerCase();
  if (/^image\//.test(declaredType)) return declaredType;

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_MIME_BY_EXTENSION[extension] || "";
}

function normalizeImageFile(file: File): File {
  const inferredType = inferImageMimeType(file);
  if (!inferredType || file.type === inferredType) return file;

  return new File([file], file.name, {
    type: inferredType,
    lastModified: file.lastModified || Date.now(),
  });
}

function getScaledSize(width: number, height: number, maxWidthOrHeight: number) {
  const longestSide = Math.max(width, height);
  const scale = longestSide > maxWidthOrHeight ? maxWidthOrHeight / longestSide : 1;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/webp",
  quality: number,
  extension: "jpg" | "webp",
): Promise<File> {
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error(`تعذر تحويل الصورة إلى ${extension.toUpperCase()}`))),
      type,
      quality,
    ),
  );

  return new File([blob], `${crypto.randomUUID()}.${extension}`, {
    type,
    lastModified: Date.now(),
  });
}

async function bitmapToJpegFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);

    return canvasToFile(canvas, "image/jpeg", 0.92, "jpg");
  } finally {
    bitmap.close();
  }
}

async function bitmapToWebpFile(file: File, maxWidthOrHeight: number): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const size = getScaledSize(bitmap.width, bitmap.height, maxWidthOrHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return canvasToFile(canvas, "image/webp", 0.92, "webp");
  } finally {
    bitmap.close();
  }
}

async function imageElementToWebpFile(file: File, maxWidthOrHeight: number): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("تعذر قراءة الصورة بواسطة المتصفح"));
      image.src = objectUrl;
    });

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;

    if (!naturalWidth || !naturalHeight) {
      throw new Error("أبعاد الصورة غير صالحة");
    }

    const size = getScaledSize(naturalWidth, naturalHeight, maxWidthOrHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvasToFile(canvas, "image/webp", 0.92, "webp");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertHeic(file: File): Promise<File> {
  try {
    const convertedBlob = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.92,
    });

    return new File([convertedBlob], `${crypto.randomUUID()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (heicToError) {
    console.warn("heic-to failed, trying heic2any:", heicToError);
  }

  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });

    const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

    return new File([convertedBlob], `${crypto.randomUUID()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (heic2anyError: any) {
    const message = String(heic2anyError?.message || "").toLowerCase();

    if (message.includes("already browser readable")) {
      return file;
    }

    console.warn("heic2any failed, trying browser decoder:", heic2anyError);
  }

  try {
    return await bitmapToJpegFile(file);
  } catch (bitmapError) {
    console.error("All HEIC decoders failed:", bitmapError);
    throw new Error("تعذر قراءة صورة HEIC هذه. جرّب إعادة اختيار الصورة أو تحويلها إلى JPEG.");
  }
}

export async function prepareImageUpload(
  file: File,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<File> {
  const normalizedFile = normalizeImageFile(file);
  const name = normalizedFile.name.toLowerCase();
  const type = inferImageMimeType(normalizedFile);

  if (!type) {
    throw new Error("هذا الملف غير صالح كصورة قابلة للرفع");
  }

  const looksLikeHeicByNameOrType =
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  let looksLikeHeicByContent = false;

  if (looksLikeHeicByNameOrType) {
    try {
      looksLikeHeicByContent = await isHeic(normalizedFile);
    } catch {
      // نعتمد على الامتداد/النوع عند فشل فحص المحتوى.
    }
  }

  const isHEIC = looksLikeHeicByNameOrType || looksLikeHeicByContent;
  let working: File = normalizedFile;

  if (isHEIC) {
    working = await convertHeic(normalizedFile);
  }

  if (!inferImageMimeType(working)) {
    throw new Error("هذا الملف غير صالح كصورة قابلة للرفع");
  }

  const maxSizeMB = opts.maxSizeMB ?? 3;
  const maxWidthOrHeight = opts.maxWidthOrHeight ?? 2400;

  try {
    const compressed = await imageCompression(working, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false,
      fileType: "image/webp",
      initialQuality: 0.92,
    });

    return new File([compressed], `${crypto.randomUUID()}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (compressionError) {
    console.warn("browser-image-compression failed, trying createImageBitmap:", compressionError);
  }

  try {
    return await bitmapToWebpFile(working, maxWidthOrHeight);
  } catch (bitmapError) {
    console.warn("createImageBitmap failed, trying HTMLImageElement:", bitmapError);
  }

  try {
    return await imageElementToWebpFile(working, maxWidthOrHeight);
  } catch (imageElementError) {
    console.error("All browser image decoders failed:", imageElementError);
    throw new Error("تعذر قراءة هذه الصورة في المتصفح. جرّب إعادة حفظها كـ JPG أو PNG ثم ارفعها مرة أخرى.");
  }
}

export async function uploadPreparedImage(prepared: File, pathPrefix: string): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error("انتهت جلسة الأدمن. سجّل الدخول ثم حاول مرة أخرى");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("/api/media/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": prepared.type || "image/webp",
        "x-upload-prefix": pathPrefix,
      },
      body: prepared,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || `فشل رفع الصورة إلى Cloudflare (${response.status})`);
    }

    return payload.url;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("انتهت مهلة رفع الصورة إلى Cloudflare. تحقق من الاتصال ثم حاول مرة أخرى");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function uploadOptimizedImage(
  file: File,
  pathPrefix: string,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<string> {
  const prepared = await prepareImageUpload(file, opts);
  return uploadPreparedImage(prepared, pathPrefix);
}
