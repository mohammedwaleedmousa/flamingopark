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

export async function prepareImageUpload(
  file: File,
  opts: { maxSizeMB?: number; maxWidthOrHeight?: number } = {}
): Promise<File> {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  let isHEIC = false;
  try {
    isHEIC = await isHeic(file); // فحص فعلي لمحتوى الملف (أدق من الاسم/النوع)
  } catch {
    isHEIC =
      type === "image/heic" ||
      type === "image/heif" ||
      name.endsWith(".heic") ||
      name.endsWith(".heif");
  }

  let working: File | Blob = file;

  if (isHEIC) {
    try {
      const convertedBlob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.85,
      });
      working = new File([convertedBlob], `${crypto.randomUUID()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } catch (heicToError) {
      // محاولة أخيرة: فك الترميز عبر محرك المتصفح/النظام نفسه بدل WASM
      try {
        working = await bitmapToJpegFile(file);
      } catch (bitmapError) {
        throw new Error(
          "تعذر قراءة هذه الصورة. جرّب فتحها في تطبيق الصور بآيفون، ثم Export/مشاركة كـ JPEG قبل رفعها"
        );
      }
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