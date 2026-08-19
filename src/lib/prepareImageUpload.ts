import { heicTo, isHeic } from "heic-to";
import { supabase } from "@/integrations/supabase/client";

const MAX_CONCURRENT_IMAGE_UPLOADS = 1;
const MAX_R2_IMAGE_BYTES = Math.floor(3.8 * 1024 * 1024);
let activeImageUploads = 0;
const pendingImageUploads: Array<() => void> = [];

async function withImageUploadSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeImageUploads >= MAX_CONCURRENT_IMAGE_UPLOADS) {
    await new Promise<void>((resolve) => pendingImageUploads.push(resolve));
  }

  activeImageUploads += 1;

  try {
    return await task();
  } finally {
    activeImageUploads = Math.max(0, activeImageUploads - 1);
    pendingImageUploads.shift()?.();
  }
}

async function bitmapToJpegFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob فشل"))),
      "image/jpeg",
      0.92,
    ),
  );

  return new File([blob], `${crypto.randomUUID()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
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
  } catch {
    return bitmapToJpegFile(file);
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("تعذر تحويل الصورة إلى WebP"))),
      "image/webp",
      quality,
    );
  });
}

async function encodeHighQualityWebp(
  file: File,
  maxWidthOrHeight: number,
  targetSizeMB: number,
): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = longestSide > maxWidthOrHeight ? maxWidthOrHeight / longestSide : 1;

    if (file.type === "image/webp" && scale === 1 && file.size <= targetSizeMB * 1024 * 1024) {
      return new File([file], `${crypto.randomUUID()}.webp`, {
        type: "image/webp",
        lastModified: Date.now(),
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // تحويل واحد سريع بجودة قوية. لا نستخدم browser-image-compression لأنه كان
    // يعلق أحياناً عند رفع الصورة الثانية في نفس جلسة تحرير المنتج.
    let blob = await canvasToWebp(canvas, 0.9);

    // حد R2 الحالي 4MB. في الحالة النادرة التي تتجاوز فيها الصورة هذا الحد،
    // نعيد الترميز مرة واحدة فقط مع جودة بصرية عالية بدلاً من ضغط متكرر/Worker.
    if (blob.size > MAX_R2_IMAGE_BYTES) {
      blob = await canvasToWebp(canvas, 0.86);
    }

    if (blob.size > MAX_R2_IMAGE_BYTES) {
      blob = await canvasToWebp(canvas, 0.82);
    }

    if (blob.size > MAX_R2_IMAGE_BYTES) {
      throw new Error("الصورة ما زالت كبيرة بعد التجهيز. استخدم صورة أصغر ثم حاول مرة أخرى");
    }

    return new File([blob], `${crypto.randomUUID()}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export async function prepareImageUpload(
  file: File,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {},
): Promise<File> {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const looksLikeHeicByNameOrType =
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  let looksLikeHeicByContent = false;
  if (looksLikeHeicByNameOrType) {
    try {
      looksLikeHeicByContent = await isHeic(file);
    } catch {
      // نعتمد على الامتداد/النوع عند فشل فحص المحتوى.
    }
  }

  const isHEIC = looksLikeHeicByNameOrType || looksLikeHeicByContent;
  let working: File = file;

  if (isHEIC) {
    try {
      working = await convertHeic(file);
    } catch {
      throw new Error("تعذر قراءة هذه الصورة. احفظها كـ JPEG ثم حاول مرة أخرى");
    }
  }

  if (!/^image\//.test(working.type || "")) {
    try {
      working = await convertHeic(file);
    } catch {
      throw new Error("هذا الملف غير صالح كصورة قابلة للرفع");
    }
  }

  const maxSizeMB = opts.maxSizeMB ?? 3;
  const maxWidthOrHeight = opts.maxWidthOrHeight ?? 2400;

  try {
    return await encodeHighQualityWebp(working, maxWidthOrHeight, maxSizeMB);
  } catch (error) {
    console.error("IMAGE PREPARE ERROR:", error);
    throw error;
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
  return withImageUploadSlot(async () => {
    const prepared = await prepareImageUpload(file, opts);
    return uploadPreparedImage(prepared, pathPrefix);
  });
}
