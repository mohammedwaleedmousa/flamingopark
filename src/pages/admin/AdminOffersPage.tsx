import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Upload, X, Loader2, Settings, Tag, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Offer {
  id: string;
  title: string;
  title_ar: string;
  subtitle: string | null;
  subtitle_ar: string | null;
  description: string | null;
  description_ar: string | null;
  image_url: string | null;
  discount_code: string | null;
  discount_percentage: number;
  start_date: string | null;
  end_date: string | null;
  countries: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

interface OffersSettings {
  id: string;
  page_title: string;
  page_subtitle: string;
  countdown_end_date: string | null;
  promo_banner_text: string;
  show_countdown: boolean;
  show_promo_banner: boolean;
}

const AdminOffersPage = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [settings, setSettings] = useState<OffersSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    subtitle: '',
    subtitle_ar: '',
    description: '',
    description_ar: '',
    image_url: '',
    discount_code: '',
    discount_percentage: 0,
    start_date: '',
    end_date: '',
    countries: ['SA', 'YE'] as string[],
    is_active: true,
    is_featured: false,
    sort_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch offers
    const { data: offersData, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .order('sort_order', { ascending: true });

    if (offersError) {
      toast({ title: 'خطأ', description: 'فشل في تحميل العروض', variant: 'destructive' });
    } else {
      setOffers(offersData || []);
    }

    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('offers_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!settingsError && settingsData) {
      setSettings(settingsData);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      title_ar: '',
      subtitle: '',
      subtitle_ar: '',
      description: '',
      description_ar: '',
      image_url: '',
      discount_code: '',
      discount_percentage: 0,
      start_date: '',
      end_date: '',
      countries: ['SA', 'YE'],
      is_active: true,
      is_featured: false,
      sort_order: offers.length,
    });
    setEditingOffer(null);
  };

  const openDialog = (offer?: Offer) => {
    if (offer) {
      setEditingOffer(offer);
      setFormData({
        title: offer.title || '',
        title_ar: offer.title_ar || '',
        subtitle: offer.subtitle || '',
        subtitle_ar: offer.subtitle_ar || '',
        description: offer.description || '',
        description_ar: offer.description_ar || '',
        image_url: offer.image_url || '',
        discount_code: offer.discount_code || '',
        discount_percentage: offer.discount_percentage || 0,
        start_date: offer.start_date ? offer.start_date.split('T')[0] : '',
        end_date: offer.end_date ? offer.end_date.split('T')[0] : '',
        countries: offer.countries || ['SA', 'YE'],
        is_active: offer.is_active ?? true,
        is_featured: offer.is_featured ?? false,
        sort_order: offer.sort_order || 0,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'خطأ', description: 'يرجى اختيار ملف صورة صحيح', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'حجم الصورة كبير جداً (الحد الأقصى 10MB)', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `offers/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error } = await supabase.storage.from('uploads').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        toast({ title: 'خطأ', description: `فشل في رفع الصورة: ${error.message}`, variant: 'destructive' });
      } else {
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));
        toast({ title: 'تم', description: 'تم رفع الصورة بنجاح' });
      }
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title_ar) {
      toast({ title: 'خطأ', description: 'يرجى إدخال عنوان العرض', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      const submitData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(submitData)
          .eq('id', editingOffer.id);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث العرض' });
      } else {
        const { error } = await supabase.from('offers').insert(submitData);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم إضافة العرض' });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;

    const { error } = await supabase.from('offers').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف العرض', variant: 'destructive' });
    } else {
      setOffers(offers.filter(o => o.id !== id));
      toast({ title: 'تم', description: 'تم حذف العرض' });
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

  const saveSettings = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('offers_settings')
        .update({
          page_title: settings.page_title,
          page_subtitle: settings.page_subtitle,
          countdown_end_date: settings.countdown_end_date,
          promo_banner_text: settings.promo_banner_text,
          show_countdown: settings.show_countdown,
          show_promo_banner: settings.show_promo_banner,
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast({ title: 'تم', description: 'تم حفظ الإعدادات' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-foreground">إدارة العروض</h1>
        <Button onClick={() => openDialog()} className="btn-gold gap-2">
          <Plus className="w-4 h-4" />
          إضافة عرض
        </Button>
      </div>

      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="offers" className="gap-2">
            <Tag className="w-4 h-4" />
            العروض
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            إعدادات الصفحة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-card border border-border rounded overflow-hidden">
                {offer.image_url && (
                  <div className="aspect-video relative">
                    <img
                      src={offer.image_url}
                      alt={offer.title_ar}
                      className="w-full h-full object-cover"
                    />
                    {offer.discount_percentage > 0 && (
                      <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm font-bold">
                        {offer.discount_percentage}% خصم
                      </div>
                    )}
                    {!offer.is_active && (
                      <div className="absolute inset-0 bg-secondary/80 flex items-center justify-center">
                        <span className="text-gold font-heading">معطل</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-heading text-foreground">{offer.title_ar}</h3>
                    {offer.is_featured && (
                      <span className="bg-gold/20 text-gold text-xs px-2 py-0.5 rounded">مميز</span>
                    )}
                  </div>
                  {offer.subtitle_ar && (
                    <p className="text-sm text-muted-foreground mb-2">{offer.subtitle_ar}</p>
                  )}
                  {offer.discount_code && (
                    <div className="bg-muted px-2 py-1 rounded text-sm mb-3">
                      كود: <span className="font-mono font-bold">{offer.discount_code}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {offer.countries?.map(c => (
                        <span key={c} className="text-xs">{c === 'SA' ? '🇸🇦' : '🇾🇪'}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openDialog(offer)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteOffer(offer.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {offers.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                لا توجد عروض. أضف عرضاً جديداً للبدء.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          {settings && (
            <div className="max-w-2xl space-y-6 bg-card p-6 rounded-lg border border-border">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">عنوان الصفحة</label>
                <Input
                  value={settings.page_title}
                  onChange={(e) => setSettings({ ...settings, page_title: e.target.value })}
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">وصف الصفحة</label>
                <Textarea
                  value={settings.page_subtitle}
                  onChange={(e) => setSettings({ ...settings, page_subtitle: e.target.value })}
                  dir="rtl"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">نص شريط الخصم</label>
                <Input
                  value={settings.promo_banner_text}
                  onChange={(e) => setSettings({ ...settings, promo_banner_text: e.target.value })}
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">تاريخ انتهاء العد التنازلي</label>
                <Input
                  type="datetime-local"
                  value={settings.countdown_end_date ? settings.countdown_end_date.slice(0, 16) : ''}
                  onChange={(e) => setSettings({ ...settings, countdown_end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={settings.show_countdown}
                    onCheckedChange={(checked) => setSettings({ ...settings, show_countdown: checked })}
                  />
                  <span className="text-sm">إظهار العد التنازلي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={settings.show_promo_banner}
                    onCheckedChange={(checked) => setSettings({ ...settings, show_promo_banner: checked })}
                  />
                  <span className="text-sm">إظهار شريط الخصم</span>
                </label>
              </div>

              <Button onClick={saveSettings} disabled={isSaving} className="btn-gold">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ الإعدادات'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Offer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">العنوان (عربي) *</label>
                <Input
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">العنوان (إنجليزي)</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">العنوان الفرعي (عربي)</label>
                <Input
                  value={formData.subtitle_ar}
                  onChange={(e) => setFormData({ ...formData, subtitle_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">العنوان الفرعي (إنجليزي)</label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">الوصف (عربي)</label>
              <Textarea
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                dir="rtl"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">الصورة</label>
              {formData.image_url ? (
                <div className="relative">
                  <img src={formData.image_url} alt="" className="w-full h-40 object-cover rounded" />
                  <button
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                <label className="block text-sm text-muted-foreground mb-2">كود الخصم</label>
                <Input
                  value={formData.discount_code}
                  onChange={(e) => setFormData({ ...formData, discount_code: e.target.value.toUpperCase() })}
                  placeholder="GOLD50"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">نسبة الخصم %</label>
                <Input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">تاريخ البداية</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">تاريخ النهاية</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
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
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: !!checked })}
                />
                <span className="text-sm">مميز</span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} disabled={isSaving} className="btn-gold flex-1">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingOffer ? 'تحديث' : 'إضافة'}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOffersPage;
