import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Upload, X, Loader2, Settings, Tag, Package, Search, Timer, GripVertical, ChevronUp, ChevronDown, TicketSlash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

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
  product_ids: string[];
}

interface OffersSettings {
  id: string;
  page_title: string;
  page_subtitle: string;
  countdown_end_date: string | null;
  promo_banner_text: string;
  show_countdown: boolean;
  show_promo_banner: boolean;
  countries: string[];
}

interface Product {
  id: string;
  name_ar: string;
  images: string[];
  price: number;
  discount: number | null;
}

const AdminOffersPage = () => {
  const SINGLE_COUNTRY = 'GLOBAL';
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<OffersSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);

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
    countries: [SINGLE_COUNTRY] as string[],
    is_active: true,
    is_featured: false,
    sort_order: 0,
    product_ids: [] as string[],
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

    // Fetch products
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name_ar, images, price, discount')
      .eq('is_active', true)
      .order('name_ar', { ascending: true });
    
    setProducts(productsData || []);

    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('offers_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!settingsError && settingsData) {
      setSettings(settingsData);
    } else {
      // Create default settings if none exist
      const { data: newSettings } = await supabase
        .from('offers_settings')
        .insert({
          page_title: 'عروض استثنائية',
          page_subtitle: 'اغتنم الفرصة واحصل على أفخم القطع الذهبية بأسعار لا تُقاوم',
          promo_banner_text: 'استخدم كود gold50 للحصول على خصم إضافي',
          show_countdown: true,
          show_promo_banner: true,
          countries: [SINGLE_COUNTRY],
        })
        .select()
        .single();
      if (newSettings) setSettings(newSettings);
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
      countries: [SINGLE_COUNTRY],
      is_active: true,
      is_featured: false,
      sort_order: offers.length,
      product_ids: [],
    });
    setEditingOffer(null);
    setProductSearch('');
    setApplyToAll(false);
  };

  const openDialog = (offer?: Offer) => {
    if (offer) {
      setEditingOffer(offer);
      setApplyToAll(offer.product_ids.length === 0);
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
        countries: offer.countries || [SINGLE_COUNTRY],
        is_active: offer.is_active ?? true,
        is_featured: offer.is_featured ?? false,
        sort_order: offer.sort_order || 0,
        product_ids: offer.product_ids || [],
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
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date + 'T23:59:59').toISOString() : null,
        product_ids: applyToAll ? [] : formData.product_ids,
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

  const toggleProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  const moveOffer = async (offerId: string, direction: 'up' | 'down') => {
    const currentIndex = offers.findIndex(o => o.id === offerId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= offers.length) return;

    const newOffers = [...offers];
    const temp = newOffers[currentIndex];
    newOffers[currentIndex] = newOffers[targetIndex];
    newOffers[targetIndex] = temp;

    // Update sort_order for both offers
    const updates = [
      { id: newOffers[currentIndex].id, sort_order: currentIndex },
      { id: newOffers[targetIndex].id, sort_order: targetIndex },
    ];

    for (const update of updates) {
      await supabase.from('offers').update({ sort_order: update.sort_order }).eq('id', update.id);
    }

    setOffers(newOffers.map((o, i) => ({ ...o, sort_order: i })));
    toast({ title: 'تم', description: 'تم تغيير الترتيب' });
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
          countries: [SINGLE_COUNTRY],
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar');
  };

  const isOfferExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const filteredProducts = products.filter(p => 
    p.name_ar.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProducts = products.filter(p => formData.product_ids.includes(p.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="التسويق"
        title="العروض"
        description={`إدارة ${offers.length} عرض`}
        actions={[
          {
            label: "إضافة عرض",
            icon: Plus,
            onClick: () => openDialog(),
            variant: "primary",
          },
          {
            label: "الكوبونات",
            icon: TicketSlash,
            href: "/admin/coupons",
            variant: "outline",
          },
        ]}
      />

      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="offers" className="gap-2">
            <Tag className="w-4 h-4" />
            العروض ({offers.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            إعدادات الصفحة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="mt-6">
          <div className="space-y-4">
            {offers.map((offer, index) => (
              <div 
                key={offer.id} 
                className={`bg-card border rounded-lg overflow-hidden ${
                  isOfferExpired(offer.end_date) ? 'opacity-50 border-destructive/50' : 'border-border'
                } ${!offer.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-stretch">
                  {/* Sort Controls */}
                  <div className="flex flex-col items-center justify-center gap-1 px-2 bg-muted/50 border-r border-border">
                    <button
                      onClick={() => moveOffer(offer.id, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-muted-foreground">{index + 1}</span>
                    <button
                      onClick={() => moveOffer(offer.id, 'down')}
                      disabled={index === offers.length - 1}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Image */}
                  {offer.image_url && (
                    <div className="w-32 h-24 flex-shrink-0">
                      <img
                        loading="lazy"
                        src={offer.image_url}
                        alt={offer.title_ar}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading text-foreground">{offer.title_ar}</h3>
                          {offer.is_featured && (
                            <span className="bg-gold/20 text-gold text-xs px-2 py-0.5 rounded">مميز</span>
                          )}
                          {!offer.is_active && (
                            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">معطل</span>
                          )}
                          {isOfferExpired(offer.end_date) && (
                            <span className="bg-destructive/20 text-destructive text-xs px-2 py-0.5 rounded">منتهي</span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {offer.discount_percentage > 0 && (
                            <span className="text-destructive font-bold">{offer.discount_percentage}% خصم</span>
                          )}
                          {offer.discount_code && (
                            <span className="bg-muted px-2 py-0.5 rounded font-mono">{offer.discount_code}</span>
                          )}
                          {offer.product_ids && offer.product_ids.length > 0 ? (
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {offer.product_ids.length} منتج
                            </span>
                          ) : (
                            <span className="text-gold">جميع المنتجات</span>
                          )}
                          {offer.end_date && (
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              ينتهي: {formatDate(offer.end_date)}
                            </span>
                          )}
                          <span className="text-xs">المتجر الموحد</span>
                        </div>
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
              </div>
            ))}
            
            {offers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border">
                <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد عروض. أضف عرضاً جديداً للبدء.</p>
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
                <label className="block text-sm text-muted-foreground mb-2">تاريخ انتهاء العد التنازلي الرئيسي</label>
                <p className="text-xs text-muted-foreground mb-2">عند انتهاء هذا الوقت، ستختفي جميع العروض تلقائياً</p>
                <Input
                  type="datetime-local"
                  value={settings.countdown_end_date ? settings.countdown_end_date.slice(0, 16) : ''}
                  onChange={(e) => setSettings({ ...settings, countdown_end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">النطاق</label>
                <p className="text-sm">الإعدادات تعمل على المتجر الموحد</p>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={settings.show_countdown}
                    onCheckedChange={(checked) => setSettings({ ...settings, show_countdown: checked })}
                  />
                  <span className="text-sm">إظهار العد التنازلي الرئيسي</span>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">الصورة</label>
              {formData.image_url ? (
                <div className="relative">
                  <img loading="lazy" src={formData.image_url} alt="" className="w-full h-32 object-cover rounded" />
                  <button
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full h-32 border-2 border-dashed border-border rounded flex flex-col items-center justify-center cursor-pointer hover:border-gold transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-1">اضغط لرفع صورة</span>
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
                  placeholder="gold50"
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
                <label className="block text-sm text-muted-foreground mb-2">تاريخ النهاية (timer العرض)</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1">سيختفي العرض تلقائياً عند هذا التاريخ</p>
              </div>
            </div>

            {/* Product Selection Mode */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-foreground">
                  <Package className="w-4 h-4 inline ml-2" />
                  المنتجات المشمولة بالعرض
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={applyToAll}
                    onCheckedChange={setApplyToAll}
                  />
                  <span className="text-sm">تطبيق على جميع المنتجات</span>
                </label>
              </div>

              {!applyToAll && (
                <>
                  {/* Selected Products */}
                  {selectedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedProducts.map(product => (
                        <div 
                          key={product.id}
                          className="flex items-center gap-2 bg-gold/10 text-gold px-3 py-1.5 rounded-full text-sm"
                        >
                          {product.images?.[0] && (
                            <img loading="lazy" src={product.images[0]} alt="" className="w-5 h-5 rounded object-cover" />
                          )}
                          <span>{product.name_ar}</span>
                          <button onClick={() => toggleProduct(product.id)} className="hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="ابحث عن منتج..."
                      className="pr-10"
                      dir="rtl"
                    />
                  </div>

                  {/* Products List */}
                  <ScrollArea className="h-48 border border-border rounded">
                    <div className="p-2 space-y-1">
                      {filteredProducts.map(product => (
                        <label
                          key={product.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                            formData.product_ids.includes(product.id) 
                              ? 'bg-gold/10 border border-gold/30' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Checkbox
                            checked={formData.product_ids.includes(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                          />
                          {product.images?.[0] && (
                            <img loading="lazy" src={product.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name_ar}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.price} ر.ي
                              {product.discount && product.discount > 0 && (
                                <span className="text-destructive mr-2">(-{product.discount}%)</span>
                              )}
                            </p>
                          </div>
                        </label>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-center text-muted-foreground py-4 text-sm">لا توجد منتجات</p>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}

              {applyToAll && (
                <p className="text-sm text-gold bg-gold/10 p-3 rounded">
                  سيتم تطبيق هذا العرض على جميع المنتجات في المتجر
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <span className="text-sm text-muted-foreground">النطاق: المتجر الموحد</span>
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
