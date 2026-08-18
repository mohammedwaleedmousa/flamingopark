import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { prepareImageUpload } from "@/lib/prepareImageUpload";

export interface VariantSize {
  size: string;
  stock: number;
}

export interface ColorVariant {
  name: string;
  hex: string;
  hex2?: string;
  images: string[];
  sizes?: Array<VariantSize | string>;
  stock?: number;
}

interface Props {
  value: ColorVariant[];
  onChange: (v: ColorVariant[]) => void;
  
}

const ColorVariantsEditor = ({ value, onChange }: Props) => {
  const [newColor, setNewColor] = useState({
    name: '',
    hex: '#F4A6B8',
    hex2: '',
    dual: false,
  });

  const [uploading, setUploading] = useState<number | null>(null);

  const addColor = () => {
    if (!newColor.name.trim()) {
      toast({
        title: 'اسم اللون مطلوب',
        variant: 'destructive',
      });
      return;
    }

    onChange([
      ...value,
      {
        name: newColor.name.trim(),
        hex: newColor.hex,
        hex2: newColor.dual && newColor.hex2 ? newColor.hex2 : undefined,
        images: [],
        sizes: [],
        stock: 0,
      },
    ]);

    setNewColor({
      name: '',
      hex: '#F4A6B8',
      hex2: '',
      dual: false,
    });
  };

  const removeColor = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const uploadImage = async (
  colorIdx: number,
  files: FileList,
) => {
  if (!value[colorIdx]?.name) {
    toast({
      title: "حدد اسم اللون أولاً",
      variant: "destructive",
    });

    return;
  }

  const fileArray = Array.from(files);

  const currentImages =
    value[colorIdx].images || [];

  if (
    currentImages.length +
      fileArray.length >
    5
  ) {
    toast({
      title:
        "الحد الأقصى هو 5 صور لكل لون",
      variant: "destructive",
    });

    return;
  }

  setUploading(colorIdx);

  try {
    const uploadPromises =
      fileArray.map(async (file) => {
        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase();

        const allowed = [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "heic",
          "heif",
        ];

        if (
          !allowed.includes(
            extension || "",
          )
        ) {
          throw new Error(
            `${file.name} ليس صورة مدعومة`,
          );
        }

        if (
          file.size >
          15 * 1024 * 1024
        ) {
          throw new Error(
            `${file.name} أكبر من 15MB`,
          );
        }

        let finalFile: File;

        try {
          finalFile =
            await prepareImageUpload(
              file,
              {
                maxSizeMB: 0.8,
                maxWidthOrHeight:
                  1800,
              },
            );
        } catch (error: any) {
          console.error(
            "IMAGE PREP ERROR:",
            file.name,
            error,
          );

          throw new Error(
            `تعذر معالجة صورة ${
              file.name
            } (${
              error?.message ||
              "خطأ غير معروف"
            })`,
          );
        }

        const fileName =
          `color-variants/` +
          `${crypto.randomUUID()}.webp`;

        const uploadPromise =
          supabase.storage
            .from("uploads")
            .upload(
              fileName,
              finalFile,
              {
                cacheControl:
                  "31536000",

                upsert: false,

                contentType:
                  "image/webp",
              },
            );

        const timeoutPromise =
          new Promise<never>(
            (_, reject) => {
              window.setTimeout(
                () => {
                  reject(
                    new Error(
                      `انتهت مهلة رفع ${file.name}`,
                    ),
                  );
                },
                90_000,
              );
            },
          );

        const { error } =
          await Promise.race([
            uploadPromise,
            timeoutPromise,
          ]);

        if (error) {
          throw error;
        }

        const { data } =
          supabase.storage
            .from("uploads")
            .getPublicUrl(
              fileName,
            );

        if (!data.publicUrl) {
          throw new Error(
            `تعذر إنشاء رابط ${file.name}`,
          );
        }

        return data.publicUrl;
      });

    const results =
      await Promise.allSettled(
        uploadPromises,
      );

    const successfulUrls =
      results
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<string> =>
            result.status ===
            "fulfilled",
        )
        .map(
          (result) =>
            result.value,
        );

    const failed =
      results.filter(
        (result) =>
          result.status ===
          "rejected",
      );

    if (
      successfulUrls.length === 0
    ) {
      const firstError =
        failed[0];

      if (
        firstError?.status ===
        "rejected"
      ) {
        throw firstError.reason;
      }

      throw new Error(
        "تعذر رفع الصور",
      );
    }

    const next = [...value];

    next[colorIdx] = {
      ...next[colorIdx],

      images: [
        ...currentImages,
        ...successfulUrls,
      ],
    };

    onChange(next);

    if (failed.length > 0) {
      toast({
        title:
          `تم رفع ${successfulUrls.length} صور`,

        description:
          `تعذر رفع ${failed.length} صور`,
      });
    } else {
      toast({
        title:
          `تم رفع ${successfulUrls.length} صور بنجاح`,
      });
    }
  } catch (error: any) {
    console.error(
      "COLOR UPLOAD ERROR:",
      error,
    );

    toast({
      title:
        "فشل رفع الصور",

      description:
        error?.message ||
        "حدث خطأ أثناء رفع الصور",

      variant:
        "destructive",
    });
  } finally {
    setUploading(null);
  }
};

  const removeImage = (colorIdx: number, imgIdx: number) => {
    const next = [...value];
    next[colorIdx] = {
      ...next[colorIdx],
      images: next[colorIdx].images.filter((_, i) => i !== imgIdx),
    };
    onChange(next);
  };
  
  return (
  <div className="bg-card border border-border rounded-3xl p-6 space-y-5">
    <div>
      <h2 className="font-heading text-lg font-bold text-foreground">
        ألوان المنتج (Variants)
      </h2>

      <p className="text-sm text-muted-foreground mt-1">
        أضف الألوان المتوفرة، ولكل لون صوره الخاصة. عند اختيار العميل للون تتغير صور المنتج.
      </p>
    </div>

    {/* إدخال بيانات اللون الجديد */}
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          اسم اللون
        </label>

        <Input
          value={newColor.name}
          onChange={(e) =>
            setNewColor((p) => ({
              ...p,
              name: e.target.value,
            }))
          }
          placeholder="مثال: وردي فاتح"
          dir="rtl"
          className="h-11 rounded-xl"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          اللون 1
        </label>

        <input
          type="color"
          value={newColor.hex}
          onChange={(e) =>
            setNewColor((p) => ({
              ...p,
              hex: e.target.value,
            }))
          }
          className="h-11 w-16 rounded-xl border cursor-pointer"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground pb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={newColor.dual}
          onChange={(e) =>
            setNewColor((p) => ({
              ...p,
              dual: e.target.checked,
            }))
          }
        />
        لونان
      </label>

      {newColor.dual && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            اللون 2
          </label>

          <input
            type="color"
            value={newColor.hex2 || "#000000"}
            onChange={(e) =>
              setNewColor((p) => ({
                ...p,
                hex2: e.target.value,
              }))
            }
            className="h-11 w-16 rounded-xl border cursor-pointer"
          />
        </div>
      )}

      <Button
        type="button"
        onClick={addColor}
        className="h-11 rounded-xl"
      >
        <Plus className="w-4 h-4 ml-1" />
        إضافة لون
      </Button>
    </div>

    {/* عرض الألوان المضافة */}
    {value.length === 0 ? (
  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl">
    <p className="text-muted-foreground text-sm">
      لم تُضف أي لون بعد
    </p>
  </div>
) : (
  <div className="space-y-5">
    {value.map((c, ci) => (
      <div
        key={ci}
        className="border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-9 h-9 rounded-full border-2 border-white shadow"
            style={
              c.hex2
                ? {
                    background: `linear-gradient(135deg, ${c.hex} 50%, ${c.hex2} 50%)`,
                  }
                : {
                    backgroundColor: c.hex,
                  }
            }
          />

          <div className="flex-1 space-y-2">
            <Input
              value={c.name}
              onChange={(e) => {
                const next = [...value];
                next[ci].name = e.target.value;
                onChange(next);
              }}
              className="h-9"
            />

            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={c.hex}
                onChange={(e) => {
                  const next = [...value];
                  next[ci].hex = e.target.value;
                  onChange(next);
                }}
                className="h-9 w-12"
              />

              {c.hex2 && (
              <input
                type="color"
                value={c.hex2}
                onChange={(e) => {
                  const next = [...value];
                  next[ci].hex2 = e.target.value;
                  onChange(next);
                }}
                className="h-9 w-12"
              />
            )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeColor(ci)}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* صور اللون */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {c.images.map((img, ii) => (
            <div
              key={ii}
              className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted group"
            >
              <img
                src={img}
                alt=""
                loading="lazy"
                className="w-full h-full object-contain"
              />

              <button
                type="button"
                onClick={() => removeImage(ci, ii)}
                className="absolute top-2 right-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
                    <label
            className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${
              uploading === ci
                ? "opacity-60 cursor-not-allowed"
                : "hover:border-primary"
            }`}
          >
            {uploading === ci ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin mb-2" />

                <span className="text-[11px]">
                  جاري الرفع...
                </span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground" />

                <span className="text-[11px] mt-2 text-center">
                  اختر حتى 5 صور
                </span>

                <span className="text-[10px] text-muted-foreground">
                  يمكن اختيار عدة صور دفعة واحدة
                </span>
              </>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              multiple
              className="hidden"
              disabled={uploading === ci}
              onChange={(e) => {
                const files = e.target.files;

                if (!files || files.length === 0) return;

                if (files.length > 5) {
                  toast({
                    title: "يمكن اختيار 5 صور كحد أقصى",
                    variant: "destructive",
                  });

                  e.target.value = "";
                  return;
                }

                uploadImage(ci, files);

                e.target.value = "";
              }}
            />
          </label>
          </div>

        {/* أحجام وكميات هذا اللون */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <label className="block text-xs text-muted-foreground mb-2">
            المقاسات والكميات لهذا اللون
          </label>
          <div className="space-y-2 mb-3">
            {(c.sizes || []).map((entry, si) => {
              const variantSize = typeof entry === 'string' ? { size: entry, stock: 0 } : entry;
              return (
                <div key={si} className="flex items-center gap-2">
                  <Input
                    value={variantSize.size}
                    onChange={(e) => {
                      const next = [...value];
                      const sizes = [...(next[ci].sizes || [])];
                      sizes[si] = { ...variantSize, size: e.target.value };
                      next[ci].sizes = sizes;
                      onChange(next);
                    }}
                    placeholder="المقاس"
                    className="h-9 flex-1 rounded-xl"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={variantSize.stock}
                    onChange={(e) => {
                      const next = [...value];
                      const sizes = [...(next[ci].sizes || [])];
                      sizes[si] = { ...variantSize, stock: Math.max(0, parseInt(e.target.value || '0') || 0) };
                      next[ci].sizes = sizes;
                      onChange(next);
                    }}
                    placeholder="الكمية"
                    className="h-9 w-28 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const next = [...value];
                      next[ci].sizes = (next[ci].sizes || []).filter((_, i) => i !== si);
                      onChange(next);
                    }}
                    aria-label="حذف المقاس"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
          {(c.sizes || []).length === 0 && (
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-muted-foreground whitespace-nowrap">كمية هذا اللون</label>
              <Input
                type="number"
                min={0}
                value={c.stock ?? 0}
                onChange={(e) => {
                  const next = [...value];
                  next[ci].stock = Math.max(0, parseInt(e.target.value || '0') || 0);
                  onChange(next);
                }}
                className="h-9 w-28 rounded-xl"
              />
              <span className="text-[11px] text-muted-foreground">استخدمها للحقائب والساعات والمنتجات بلا مقاسات</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="أضف مقاساً"
              dir="rtl"
              className="h-9 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const raw = (e.target as HTMLInputElement).value.trim();
                  if (!raw) return;
                  const next = [...value];
                  const sizes = (next[ci].sizes || []).map((size) => typeof size === 'string' ? size : size.size);
                  if (sizes.includes(raw)) return;
                  next[ci].sizes = [...(next[ci].sizes || []), { size: raw, stock: 0 }];
                  onChange(next);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <span className="text-[11px] text-muted-foreground self-center">اضغط Enter للإضافة</span>
          </div>
        </div>
      </div>
    ))}
  </div>
  
)}
</div>
  );
};

export default ColorVariantsEditor;
