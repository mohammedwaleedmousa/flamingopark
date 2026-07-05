import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';

export interface ColorVariant {
  name: string;
  hex: string;
  images: string[];
}

interface Props {
  value: ColorVariant[];
  onChange: (v: ColorVariant[]) => void;
}

const ColorVariantsEditor = ({ value, onChange }: Props) => {
  const [newColor, setNewColor] = useState({ name: '', hex: '#F4A6B8' });
  const [uploading, setUploading] = useState<number | null>(null);

  const addColor = () => {
    if (!newColor.name.trim()) {
      toast({ title: 'اسم اللون مطلوب', variant: 'destructive' });
      return;
    }
    onChange([...value, { name: newColor.name.trim(), hex: newColor.hex, images: [] }]);
    setNewColor({ name: '', hex: '#F4A6B8' });
  };

  const removeColor = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const uploadImage = async (colorIdx: number, file: File) => {
    setUploading(colorIdx);
    try {
      const fileName = `color-variants/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
      const next = [...value];
      next[colorIdx] = { ...next[colorIdx], images: [...next[colorIdx].images, data.publicUrl] };
      onChange(next);
    } catch (e: any) {
      toast({ title: 'خطأ في الرفع', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (colorIdx: number, imgIdx: number) => {
    const next = [...value];
    next[colorIdx] = { ...next[colorIdx], images: next[colorIdx].images.filter((_, i) => i !== imgIdx) };
    onChange(next);
  };

  return (
    <div className="bg-card border border-border rounded p-6 space-y-4">
      <div>
        <h2 className="font-heading text-lg text-foreground">ألوان المنتج (Variants)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          أضف الألوان المتوفرة، ولكل لون ارفع صوره الخاصة. عند اختيار العميل للون تتغير الصور في البانر.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">اسم اللون</label>
          <Input
            value={newColor.name}
            onChange={(e) => setNewColor((p) => ({ ...p, name: e.target.value }))}
            placeholder="مثال: وردي فاتح"
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">اللون</label>
          <input
            type="color"
            value={newColor.hex}
            onChange={(e) => setNewColor((p) => ({ ...p, hex: e.target.value }))}
            className="h-10 w-16 rounded border border-input cursor-pointer"
          />
        </div>
        <Button type="button" onClick={addColor}>
          <Plus className="w-4 h-4 ml-1" /> إضافة لون
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">لم تُضِف أي لون بعد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {value.map((c, ci) => (
            <div key={ci} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-8 h-8 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{c.hex}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeColor(ci)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {c.images.map((img, ii) => (
                  <div key={ii} className="relative aspect-square rounded overflow-hidden bg-muted group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(ci, ii)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-primary transition">
                  {uploading === ci ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(ci, f);
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