import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';

export interface ColorVariant {
  name: string;
  hex: string;
  hex2?: string;
  images: string[];
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

  const uploadImage = async (colorIdx: number, files: FileList) => {
    if (!value[colorIdx]?.name) {
      toast({
        title: 'حدد اسم اللون أولاً',
        variant: 'destructive',
      });
      return;
    }

    setUploading(colorIdx);

    try {
      const fileArray = Array.from(files);

      const uploadPromises = fileArray.map(async (file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const allowed = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

        if (!allowed.includes(extension || '')) {
          throw new Error(`${file.name} ليس صورة مدعومة`);
        }

        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`${file.name} أكبر من 15MB`);
        }

        let imageFile = file;

        if (extension === 'heic' || extension === 'heif') {
          imageFile = new File([file], `${crypto.randomUUID()}.jpg`, {
            type: 'image/jpeg',
          });
        }

        const compressedFile = await imageCompression(imageFile, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: 'image/webp',
        });

        const fileName = `color-variants/${crypto.randomUUID()}.webp`;

        const { error } = await supabase.storage
          .from('uploads')
          .upload(fileName, compressedFile, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/webp',
          });

        if (error) throw error;

        const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
        return data.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);

      const next = [...value];
      next[colorIdx] = {
        ...next[colorIdx],
        images: [...(next[colorIdx].images || []), ...urls],
      };

      onChange(next);

      toast({
        title: `تم رفع ${urls.length} صور`,
      });
    } catch (error: any) {
      console.error('COLOR UPLOAD ERROR:', error);
      toast({
        title: 'فشل رفع الصور',
        description: error.message,
        variant: 'destructive',
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
          <label className="block text-xs text-muted-foreground mb-1">اسم اللون</label>
          <Input
            value={newColor.name}
            onChange={(e) => setNewColor((p) => ({ ...p, name: e.target.value }))}
            placeholder="مثال: وردي فاتح"
            dir="rtl"
            className="h-11 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">اللون 1</label>
          <input
            type="color"
            value={newColor.hex}
            onChange={(e) => setNewColor((p) => ({ ...p, hex: e.target.value }))}
            className="h-11 w-16 rounded-xl border cursor-pointer"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground pb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={newColor.dual}
            onChange={(e) => setNewColor((p) => ({ ...p, dual: e.target.checked }))}
          />
          لونان
        </label>

        {newColor.dual && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">اللون 2</label>
            <input
              type="color"
              value={newColor.hex2 || '#000000'}
              onChange={(e) => setNewColor((p) => ({ ...p, hex2: e.target.value }))}
              className="h-11 w-16 rounded-xl border cursor-pointer"
            />
          </div>
        )}

        <Button type="button" onClick={addColor} className="h-11 rounded-xl">
          <Plus className="w-4 h-4 ml-1" />
          إضافة لون
        </Button>
      </div>

      {/* عرض الألوان المضافة */}
      {value.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground text-sm">لم تُضف أي لون بعد</p>
        </div>
      ) : (
        <div className="space-y-5">
          {value.map((c, ci) => (
            <div key={ci} className="border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-9 h-9 rounded-full border-2 border-white shadow"
                  style={
                    c.hex2
                      ? { background: `linear-gradient(135deg,${c.hex} 50%,${c.hex2} 50%)` }
                      : { backgroundColor: c.hex }
                  }
                />

                <div className="flex-1">
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

    <input
      type="color"
      value={c.hex2 || "#000000"}
      onChange={(e) => {
        const next = [...value];
        next[ci].hex2 = e.target.value;
        onChange(next);
      }}
      className="h-9 w-12"
    />
  </div>
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
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
                  >
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
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
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:border-primary'
                  }`}
                >
                  {uploading === ci ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <span className="text-[11px]">جاري الرفع</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[11px] mt-1 text-muted-foreground">
                        رفع صور
                      </span>
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    className="hidden"
                    disabled={uploading === ci}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length) {
                        uploadImage(ci, files);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorVariantsEditor;
