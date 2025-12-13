import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Plus, Edit, Trash2, Upload, X, Loader2, ZoomIn, Move } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Banner {
  id: string;
  title: string;
  title_ar: string;
  subtitle: string;
  subtitle_ar: string;
  image_url: string;
  cta_text: string;
  cta_text_ar: string;
  cta_link: string;
  countries: string[];
  is_active: boolean;
  sort_order: number;
  image_zoom: number;
  image_position_x: number;
  image_position_y: number;
}

const AdminBannersPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    subtitle: '',
    subtitle_ar: '',
    image_url: '',
    cta_text: '',
    cta_text_ar: '',
    cta_link: '/products',
    countries: ['SA', 'YE'] as string[],
    is_active: true,
    sort_order: 0,
    image_zoom: 1,
    image_position_x: 50,
    image_position_y: 50,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل البانرات', variant: 'destructive' });
    } else {
      setBanners(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      title_ar: '',
      subtitle: '',
      subtitle_ar: '',
      image_url: '',
      cta_text: '',
      cta_text_ar: '',
      cta_link: '/products',
      countries: ['SA', 'YE'],
      is_active: true,
      sort_order: banners.length,
      image_zoom: 1,
      image_position_x: 50,
      image_position_y: 50,
    });
    setEditingBanner(null);
  };

  const openDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        title_ar: banner.title_ar || '',
        subtitle: banner.subtitle || '',
        subtitle_ar: banner.subtitle_ar || '',
        image_url: banner.image_url || '',
        cta_text: banner.cta_text || '',
        cta_text_ar: banner.cta_text_ar || '',
        cta_link: banner.cta_link || '/products',
        countries: banner.countries || ['SA', 'YE'],
        is_active: banner.is_active ?? true,
        sort_order: banner.sort_order || 0,
        image_zoom: banner.image_zoom || 1,
        image_position_x: banner.image_position_x ?? 50,
        image_position_y: banner.image_position_y ?? 50,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'خطأ', description: 'يرجى اختيار ملف صورة صحيح', variant: 'destructive' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'حجم الصورة كبير جداً (الحد الأقصى 10MB)', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      // Create unique file name with proper extension
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `banners/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error } = await supabase.storage.from('uploads').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Upload error:', error);
        toast({ title: 'خطأ', description: `فشل في رفع الصورة: ${error.message}`, variant: 'destructive' });
      } else {
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));
        toast({ title: 'تم', description: 'تم رفع الصورة بنجاح' });
      }
    } catch (err: any) {
      console.error('Upload exception:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title_ar || !formData.image_url) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(formData)
          .eq('id', editingBanner.id);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث البانر' });
      } else {
        const { error } = await supabase.from('banners').insert(formData);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم إضافة البانر' });
      }
      setIsDialogOpen(false);
      fetchBanners();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البانر؟')) return;

    const { error } = await supabase.from('banners').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف البانر', variant: 'destructive' });
    } else {
      setBanners(banners.filter(b => b.id !== id));
      toast({ title: 'تم', description: 'تم حذف البانر' });
    }
  };

  const toggleCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-foreground">البانرات</h1>
        <Button onClick={() => openDialog()} className="btn-gold gap-2">
          <Plus className="w-4 h-4" />
          إضافة بانر
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-card border border-border rounded overflow-hidden">
            <div className="aspect-video relative">
              <img
                src={banner.image_url}
                alt={banner.title_ar}
                className="w-full h-full object-cover"
              />
              {!banner.is_active && (
                <div className="absolute inset-0 bg-secondary/80 flex items-center justify-center">
                  <span className="text-gold font-heading">معطل</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-heading text-foreground mb-1">{banner.title_ar}</h3>
              <p className="text-sm text-muted-foreground mb-3">{banner.subtitle_ar}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {banner.countries?.map(c => (
                    <span key={c} className="text-xs">{c === 'SA' ? '🇸🇦' : '🇾🇪'}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openDialog(banner)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteBanner(banner.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            لا توجد بانرات
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'تعديل البانر' : 'إضافة بانر جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">العنوان (عربي) *</label>
              <Input
                value={formData.title_ar}
                onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">العنوان الفرعي</label>
              <Input
                value={formData.subtitle_ar}
                onChange={(e) => setFormData({ ...formData, subtitle_ar: e.target.value })}
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">الصورة *</label>
              {formData.image_url ? (
                <div className="space-y-4">
                  {/* Image Preview with positioning */}
                  <div className="relative border border-border rounded overflow-hidden" style={{ height: '200px' }}>
                    <img 
                      src={formData.image_url} 
                      alt="" 
                      className="w-full h-full"
                      style={{
                        objectFit: 'cover',
                        transform: `scale(${formData.image_zoom})`,
                        objectPosition: `${formData.image_position_x}% ${formData.image_position_y}%`,
                      }}
                    />
                    <button
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Image Controls */}
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    {/* Zoom */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ZoomIn className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm text-muted-foreground">التكبير: {formData.image_zoom.toFixed(1)}x</label>
                      </div>
                      <Slider
                        value={[formData.image_zoom]}
                        onValueChange={([v]) => setFormData({ ...formData, image_zoom: v })}
                        min={1}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Position X */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Move className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm text-muted-foreground">الموضع الأفقي: {formData.image_position_x}%</label>
                      </div>
                      <Slider
                        value={[formData.image_position_x]}
                        onValueChange={([v]) => setFormData({ ...formData, image_position_x: v })}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Position Y */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Move className="w-4 h-4 text-muted-foreground rotate-90" />
                        <label className="text-sm text-muted-foreground">الموضع العمودي: {formData.image_position_y}%</label>
                      </div>
                      <Slider
                        value={[formData.image_position_y]}
                        onValueChange={([v]) => setFormData({ ...formData, image_position_y: v })}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Reset Button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFormData({ ...formData, image_zoom: 1, image_position_x: 50, image_position_y: 50 })}
                    >
                      إعادة تعيين الموضع
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="block w-full h-40 border-2 border-dashed border-border rounded flex flex-col items-center justify-center cursor-pointer hover:border-gold transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-2">اضغط لرفع صورة</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">نص الزر</label>
                <Input
                  value={formData.cta_text_ar}
                  onChange={(e) => setFormData({ ...formData, cta_text_ar: e.target.value })}
                  placeholder="تسوق الآن"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">رابط الزر</label>
                <Input
                  value={formData.cta_link}
                  onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                  placeholder="/products"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.countries.includes('SA')}
                  onCheckedChange={() => toggleCountry('SA')}
                />
                <span className="text-sm">🇸🇦 السعودية</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.countries.includes('YE')}
                  onCheckedChange={() => toggleCountry('YE')}
                />
                <span className="text-sm">🇾🇪 اليمن</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                />
                <span className="text-sm">نشط</span>
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} disabled={isSaving} className="btn-gold flex-1">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingBanner ? 'تحديث' : 'إضافة'}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBannersPage;
