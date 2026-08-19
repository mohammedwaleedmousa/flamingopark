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

const UPLOAD_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function inferImageMimeType(file: File): string {
  const declaredType = (file.type || "").toLowerCase();
  if (/^image\//.test(declaredType)) return declaredType;

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_MIME_BY_EXTENSION[extension] || "";
}

async function sniffBrowserImageMimeType(file: File): Promise<string> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

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
  } catch (error) {
    console.warn("Image signature detection failed:", error);
  }

  return "";
}

function normalizeImageFile(file: File, contentMime = ""): File {
  const inferredType = contentMime || inferImageMimeType(file);
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

async function bitmapToWebpFile(file: File, maxWidthOrHeight: number, quality = 0.9): Promise<File> {
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

    return canvasToFile(canvas, "image/webp", quality, "webp");
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

    return canvasToFile(canvas, "image/webp", 0.9, "webp");
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

async function encodeHighQualityWebp(file: File, maxWidthOrHeight: number, maxSizeMB: number): Promise<File> {
  const targetBytes = maxSizeMB * 1024 * 1024;
  const bitmap = await createImageBitmap(file);

  try {
    const size = getScaledSize(bitmap.width, bitmap.height, maxWidthOrHeight);
    const needsResize = size.width !== bitmap.width || size.height !== bitmap.height;

    if (file.type === "image/webp" && !needsResize && file.size <= targetBytes) {
      return new File([file], `${crypto.randomUUID()}.webp`, {
        type: "image/webp",
        lastModified: Date.now(),
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const encoded = await canvasToFile(canvas, "image/webp", 0.9, "webp");

    if (encoded.size <= Math.max(targetBytes * 1.2, 900 * 1024)) {
      return encoded;
    }

    const compressed = await imageCompression(encoded, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false,
      fileType: "image/webp",
      initialQuality: 0.9,
      maxIteration: 3,
    });

    return new File([compressed], `${crypto.randomUUID()}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

async function tryDetectHeic(file: File): Promise<boolean> {
  try {
    return await isHeic(file);
  } catch (error) {
    console.warn("HEIC content detection failed:", error);
    return false;
  }
}

export async function prepareImageUpload(
  file: File,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<File> {
  const contentMime = await sniffBrowserImageMimeType(file);
  const normalizedFile = normalizeImageFile(file, contentMime);
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

  const maxSizeMB = opts.maxSizeMB ?? 1.5;
  const maxWidthOrHeight = opts.maxWidthOrHeight ?? 2000;

  let working: File = normalizedFile;
  let isHEIC = looksLikeHeicByNameOrType;

  if (isHEIC) {
    working = await convertHeic(normalizedFile);
  }

  if (!inferImageMimeType(working)) {
    throw new Error("هذا الملف غير صالح كصورة قابلة للرفع");
  }

  try {
    return await encodeHighQualityWebp(working, maxWidthOrHeight, maxSizeMB);
  } catch (fastError) {
    console.warn("Fast WebP encode failed:", fastError);
  }

  // بعض صور iPhone/WhatsApp تكون HEIC فعليًا لكن اسمها أو MIME يقول JPG.
  // نفحص محتوى الملف فقط عند فشل القراءة العادية حتى لا نضيف تكلفة لكل صورة سليمة.
  if (!isHEIC && await tryDetectHeic(normalizedFile)) {
    isHEIC = true;
    working = await convertHeic(normalizedFile);

    try {
      return await encodeHighQualityWebp(working, maxWidthOrHeight, maxSizeMB);
    } catch (heicEncodeError) {
      console.warn("Converted HEIC WebP encode failed:", heicEncodeError);
    }
  }

  try {
    const compressed = await imageCompression(working, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false,
      fileType: "image/webp",
      initialQuality: 0.9,
      maxIteration: 3,
    });

    return new File([compressed], `${crypto.randomUUID()}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (compressionError) {
    console.warn("browser-image-compression failed, trying createImageBitmap:", compressionError);
  }

  try {
    return await bitmapToWebpFile(working, maxWidthOrHeight, 0.9);
  } catch (bitmapError) {
    console.warn("createImageBitmap failed, trying HTMLImageElement:", bitmapError);
  }

  try {
    return await imageElementToWebpFile(working, maxWidthOrHeight);
  } catch (imageElementError) {
    console.error("All browser image decoders failed:", imageElementError);
  }

  // إذا كان الملف JPEG/PNG/WebP حقيقيًا حسب ترويسة الملف، لا نمنع الأدمن من الرفع
  // فقط لأن Chromium لم يستطع فكّه محليًا. Supabase سيحفظ الأصل، والتحويلات تتم عند العرض.
  if (!isHEIC && UPLOAD_EXTENSION_BY_MIME[contentMime]) {
    console.warn("Uploading original browser image because local decoding failed", {
      name: normalizedFile.name,
      type: contentMime,
      size: normalizedFile.size,
    });

    return new File([normalizedFile], `${crypto.randomUUID()}.${UPLOAD_EXTENSION_BY_MIME[contentMime]}`, {
      type: contentMime,
      lastModified: Date.now(),
    });
  }

  throw new Error("تعذر قراءة هذه الصورة. تأكد أنها JPG أو PNG أو WebP أو HEIC سليمة ثم حاول مرة أخرى.");
}

function sanitizeUploadPrefix(pathPrefix: string) {
  return pathPrefix
    .split("/")
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_-]/g, "-"))
    .filter(Boolean)
    .join("/");
}

function getUploadExtension(file: File) {
  const type = (file.type || "").toLowerCase();
  if (UPLOAD_EXTENSION_BY_MIME[type]) return UPLOAD_EXTENSION_BY_MIME[type];

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "webp";
}

export async function uploadPreparedImage(prepared: File, pathPrefix: string): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error("انتهت الجلسة. سجّل الدخول ثم حاول مرة أخرى");
  }

  const prefix = sanitizeUploadPrefix(pathPrefix) || "images";
  const extension = getUploadExtension(prepared);
  const path = `${prefix}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(path, prepared, {
      cacheControl: "31536000",
      upsert: false,
      contentType: prepared.type || "image/webp",
    });

  if (uploadError) {
    throw new Error(uploadError.message || "تعذر رفع الصورة إلى Supabase");
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("تم رفع الصورة ولكن تعذر إنشاء رابطها العام");
  }

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
