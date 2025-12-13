import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Loader2, Upload, X, LayoutGrid, Plus, Trash2 } from 'lucide-react';

interface HomepageSection {
  id: string;
  title: string;
  title_ar: string;
  filter_type: string;
  is_active: boolean;
}

interface Accessory {
  name: string;
  name_ar: string;
  price: number;
}

const AdminProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    slug: '',
    price: '',
    original_price: '',
    discount: '0',
    description: '',
    description_ar: '',
    category: '',
    brand: '',
    in_stock: true,
    is_featured: false,
    is_best_seller: false,
    is_active: true,
    countries: ['SA', 'YE'] as string[],
    images: [] as string[],
    section_ids: [] as string[],
    has_sizes: false,
    sizes: [] as string[],
    accessories: [] as Accessory[],
  });

  const [newSize, setNewSize] = useState('');
  const [newAccessory, setNewAccessory] = useState({ name: '', name_ar: '', price: '' });

  // Fetch all homepage sections
  const { data: sections = [] } = useQuery({
    queryKey: ['all-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('id, title, title_ar, filter_type, is_active')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as HomepageSection[];
    },
  });

  useEffect(() => {
    if (isEditing) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المنتج', variant: 'destructive' });
      navigate('/admin/products');
    } else {
      setFormData({
        name: data.name || '',
        name_ar: data.name_ar || '',
        slug: data.slug || '',
        price: data.price?.toString() || '',
        original_price: data.original_price?.toString() || '',
        discount: data.discount?.toString() || '0',
        description: data.description || '',
        description_ar: data.description_ar || '',
        category: data.category || '',
        brand: data.brand || '',
        in_stock: data.in_stock ?? true,
        is_featured: data.is_featured ?? false,
        is_best_seller: data.is_best_seller ?? false,
        is_active: data.is_active ?? true,
        countries: data.countries || ['SA', 'YE'],
        images: data.images || [],
        section_ids: (data as any).section_ids || [],
        has_sizes: (data as any).has_sizes ?? false,
        sizes: (data as any).sizes || [],
        accessories: ((data as any).accessories || []) as Accessory[],
      });
    }
    setIsLoading(false);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  };

  const handleNameChange = (value: string) => {
    setFormData({
      ...formData,
      name: value,
      slug: generateSlug(value),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('uploads')
        .upload(`products/${fileName}`, file);

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في رفع الصورة', variant: 'destructive' });
      } else {
        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(`products/${fileName}`);

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, urlData.publicUrl],
        }));
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const toggleCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country],
    }));
  };

  const toggleSection = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      section_ids: prev.section_ids.includes(sectionId)
        ? prev.section_ids.filter(id => id !== sectionId)
        : [...prev.section_ids, sectionId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name_ar || !formData.price || !formData.category) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const productData = {
      name: formData.name,
      name_ar: formData.name_ar,
      slug: formData.slug || generateSlug(formData.name),
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      discount: parseInt(formData.discount) || 0,
      description: formData.description,
      description_ar: formData.description_ar,
      category: formData.category,
      brand: formData.brand,
      in_stock: formData.in_stock,
      is_featured: formData.is_featured,
      is_best_seller: formData.is_best_seller,
      is_active: formData.is_active,
      countries: formData.countries,
      images: formData.images,
      section_ids: formData.section_ids,
      has_sizes: formData.has_sizes,
      sizes: formData.sizes,
      accessories: formData.accessories as unknown as any,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث المنتج بنجاح' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
      }
      navigate('/admin/products');
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/products')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <h1 className="font-heading text-3xl text-foreground">
          {isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <h2 className="font-heading text-lg text-foreground">المعلومات الأساسية</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">الاسم (إنجليزي)</label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Product Name"
              />
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">الاسم (عربي) *</label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="اسم المنتج"
                dir="rtl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-body text-muted-foreground mb-2">الرابط (Slug)</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="product-name"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">السعر *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">السعر الأصلي</label>
              <Input
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">الخصم %</label>
              <Input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">التصنيف *</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="necklaces"
              />
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">الماركة</label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="ERMGOLD"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-body text-muted-foreground mb-2">الوصف (عربي)</label>
            <Textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              rows={3}
              dir="rtl"
            />
          </div>
        </div>

        {/* Images */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <h2 className="font-heading text-lg text-foreground">الصور</h2>
          
          <div className="flex flex-wrap gap-4">
            {formData.images.map((img, index) => (
              <div key={index} className="relative w-24 h-24">
                <img src={img} alt="" className="w-full h-full object-cover rounded" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-24 h-24 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-gold transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <h2 className="font-heading text-lg text-foreground">الإعدادات</h2>
          
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.in_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, in_stock: !!checked })}
              />
              <span className="text-sm">متوفر</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: !!checked })}
              />
              <span className="text-sm">مميز</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.is_best_seller}
                onCheckedChange={(checked) => setFormData({ ...formData, is_best_seller: !!checked })}
              />
              <span className="text-sm">الأكثر مبيعاً</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
              />
              <span className="text-sm">نشط</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-body text-muted-foreground mb-2">البلدان</label>
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
            </div>
          </div>

          {/* Sections */}
          {sections.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-body text-muted-foreground mb-3">
                <LayoutGrid className="w-4 h-4" />
                أقسام الصفحة الرئيسية
              </label>
              <div className="flex flex-wrap gap-3">
                {sections.map((section) => (
                  <label 
                    key={section.id} 
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all ${
                      formData.section_ids.includes(section.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={formData.section_ids.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <span className="text-sm">{section.title_ar}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                اختر الأقسام التي تريد عرض هذا المنتج فيها
              </p>
            </div>
          )}
        </div>

        {/* Sizes Section */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-foreground">الأحجام</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.has_sizes}
                onCheckedChange={(checked) => setFormData({ ...formData, has_sizes: !!checked })}
              />
              <span className="text-sm">هذا المنتج له أحجام</span>
            </label>
          </div>

          {formData.has_sizes && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="أضف حجم (مثال: S, M, L, XL)"
                  dir="rtl"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newSize.trim() && !formData.sizes.includes(newSize.trim())) {
                      setFormData(prev => ({
                        ...prev,
                        sizes: [...prev.sizes, newSize.trim()],
                      }));
                      setNewSize('');
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {formData.sizes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.sizes.map((size, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg"
                    >
                      <span className="text-sm">{size}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          sizes: prev.sizes.filter((_, i) => i !== index),
                        }))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accessories Section */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <h2 className="font-heading text-lg text-foreground">الملحقات الإضافية</h2>
          <p className="text-sm text-muted-foreground">
            أضف ملحقات اختيارية للمنتج. عند اختيار أي ملحق سيُضاف سعره للسعر الأساسي.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={newAccessory.name}
              onChange={(e) => setNewAccessory(prev => ({ ...prev, name: e.target.value }))}
              placeholder="الاسم (إنجليزي)"
            />
            <Input
              value={newAccessory.name_ar}
              onChange={(e) => setNewAccessory(prev => ({ ...prev, name_ar: e.target.value }))}
              placeholder="الاسم (عربي)"
              dir="rtl"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                value={newAccessory.price}
                onChange={(e) => setNewAccessory(prev => ({ ...prev, price: e.target.value }))}
                placeholder="السعر الإضافي"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (newAccessory.name_ar.trim() && newAccessory.price) {
                    setFormData(prev => ({
                      ...prev,
                      accessories: [...prev.accessories, {
                        name: newAccessory.name.trim(),
                        name_ar: newAccessory.name_ar.trim(),
                        price: parseFloat(newAccessory.price),
                      }],
                    }));
                    setNewAccessory({ name: '', name_ar: '', price: '' });
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {formData.accessories.length > 0 && (
            <div className="space-y-2">
              {formData.accessories.map((acc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <span className="font-medium">{acc.name_ar}</span>
                    {acc.name && <span className="text-muted-foreground text-sm mr-2">({acc.name})</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gold font-heading">+{acc.price}</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        accessories: prev.accessories.filter((_, i) => i !== index),
                      }))}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving} className="btn-gold">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'تحديث' : 'إضافة'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminProductFormPage;
