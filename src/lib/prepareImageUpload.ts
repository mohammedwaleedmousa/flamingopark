import { heicTo, isHeic } from "heic-to";
import imageCompression from "browser-image-compression";

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
      0.85
    )
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
      quality: 0.85,
    });
    return new File([convertedBlob], `${crypto.randomUUID()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return await bitmapToJpegFile(file); // خطة احتياطية عبر محرك المتصفح نفسه
  }
}

export async function prepareImageUpload(
  file: File,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {}
): Promise<File> {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  const looksLikeHeicByNameOrType =
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  let looksLikeHeicByContent = false;
  try {
    looksLikeHeicByContent = await isHeic(file);
  } catch {
    // تجاهل: إن فشل الفحص سنعتمد على الامتداد/النوع فقط
  }

  // نعتبره HEIC لو أي من الفحصين أثبت ذلك (وليس فقط عند فشل isHeic)
  const isHEIC = looksLikeHeicByNameOrType || looksLikeHeicByContent;

  let working: File | Blob = file;

  if (isHEIC) {
    try {
      working = await convertHeic(file);
    } catch {
      throw new Error(
        "تعذر قراءة هذه الصورة. جرّب فتحها في تطبيق الصور بآيفون، ثم Export/مشاركة كـ JPEG قبل رفعها"
      );
    }
  }

  // حماية أخيرة: لو وصلنا هنا وما زال النوع ليس صورة (مثلاً HEIC لم يُكتشف إطلاقًا)، حاول تحويله كخيار أخير
  if (!/^image\//.test((working as File).type || "")) {
    try {
      working = await convertHeic(file);
    } catch {
      throw new Error(
        "هذا الملف غير صالح كصورة قابلة للقراءة في المتصفح. جرّب حفظه كـ JPEG من الهاتف أولاً"
      );
    }
  }

  const compressed = await imageCompression(working as File, {
    maxSizeMB: opts.maxSizeMB ?? 1,
    maxWidthOrHeight: opts.maxWidthOrHeight ?? 1600,
    useWebWorker: true,
    fileType: "image/webp",
  });

  return new File([compressed], `${crypto.randomUUID()}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}