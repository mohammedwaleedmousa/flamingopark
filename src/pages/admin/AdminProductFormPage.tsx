import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Loader2, Upload, X, LayoutGrid, Plus, Trash2, Truck, Shield, RotateCcw } from 'lucide-react';

interface HomepageSection {
  id: string;
  title: string;
  title_ar: string;
  filter_type: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  is_active: boolean | null;
}

interface Accessory {
  name: string;
  name_ar: string;
  price: number;
  image_url?: string;
}

interface ProductFeature {
  icon: string;
  title: string;
  desc: string;
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
    features: [] as ProductFeature[],
  });

  const [newSize, setNewSize] = useState('');
  const [newAccessory, setNewAccessory] = useState({ name: '', name_ar: '', price: '', image_url: '' });
  const [newFeature, setNewFeature] = useState({ icon: 'truck', title: '', desc: '' });
  const [uploadingAccessoryImage, setUploadingAccessoryImage] = useState(false);

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

  // Fetch all categories
  const { data: categories = [] } = useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_ar, slug, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch all brands
  const { data: brands = [] } = useQuery({
    queryKey: ['all-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
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
        features: ((data as any).features || []) as ProductFeature[],
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
    
    if (!formData.name_ar || !formData.price || !formData.category || !formData.brand) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة (الاسم، السعر، الفئة، الماركة)', variant: 'destructive' });
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
      features: formData.features as unknown as any,
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
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name_ar} ({cat.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">الماركة *</label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الماركة" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.name.trim()}>
                      {brand.name.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                type="number"
                value={newAccessory.price}
                onChange={(e) => setNewAccessory(prev => ({ ...prev, price: e.target.value }))}
                placeholder="السعر الإضافي"
              />
              <div className="flex gap-2">
                {newAccessory.image_url ? (
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img src={newAccessory.image_url} alt="" className="w-full h-full object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setNewAccessory(prev => ({ ...prev, image_url: '' }))}
                      className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex-1 h-12 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-gold transition-colors">
                    {uploadingAccessoryImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        صورة الملحق
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAccessoryImage(true);
                        const fileName = `${Date.now()}-${file.name}`;
                        const { error } = await supabase.storage
                          .from('uploads')
                          .upload(`accessories/${fileName}`, file);
                        if (!error) {
                          const { data: urlData } = supabase.storage
                            .from('uploads')
                            .getPublicUrl(`accessories/${fileName}`);
                          setNewAccessory(prev => ({ ...prev, image_url: urlData.publicUrl }));
                        }
                        setUploadingAccessoryImage(false);
                      }}
                    />
                  </label>
                )}
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
                          image_url: newAccessory.image_url || undefined,
                        }],
                      }));
                      setNewAccessory({ name: '', name_ar: '', price: '', image_url: '' });
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {formData.accessories.length > 0 && (
            <div className="space-y-2">
              {formData.accessories.map((acc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {acc.image_url && (
                      <img src={acc.image_url} alt={acc.name_ar} className="w-10 h-10 object-cover rounded" />
                    )}
                    <div>
                      <span className="font-medium">{acc.name_ar}</span>
                      {acc.name && <span className="text-muted-foreground text-sm mr-2">({acc.name})</span>}
                    </div>
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

        {/* Product Features Section */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <h2 className="font-heading text-lg text-foreground">ميزات المنتج</h2>
          <p className="text-sm text-muted-foreground">أضف ميزات تظهر تحت المنتج (مثل: التوصيل، الضمان، الإرجاع)</p>
          
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">الأيقونة</label>
                <select
                  value={newFeature.icon}
                  onChange={(e) => setNewFeature(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="truck">🚚 شحن</option>
                  <option value="shield">🛡️ ضمان</option>
                  <option value="rotate">🔄 إرجاع</option>
                  <option value="star">⭐ جودة</option>
                  <option value="clock">⏰ وقت</option>
                  <option value="check">✓ تأكيد</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">العنوان</label>
                <Input
                  value={newFeature.title}
                  onChange={(e) => setNewFeature(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: شحن سريع"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">الوصف</label>
                <div className="flex gap-2">
                  <Input
                    value={newFeature.desc}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, desc: e.target.value }))}
                    placeholder="مثال: توصيل خلال 2-5 أيام"
                    dir="rtl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newFeature.title.trim() && newFeature.desc.trim()) {
                        setFormData(prev => ({
                          ...prev,
                          features: [...prev.features, {
                            icon: newFeature.icon,
                            title: newFeature.title.trim(),
                            desc: newFeature.desc.trim(),
                          }],
                        }));
                        setNewFeature({ icon: 'truck', title: '', desc: '' });
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {formData.features.length > 0 && (
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {feature.icon === 'truck' && '🚚'}
                      {feature.icon === 'shield' && '🛡️'}
                      {feature.icon === 'rotate' && '🔄'}
                      {feature.icon === 'star' && '⭐'}
                      {feature.icon === 'clock' && '⏰'}
                      {feature.icon === 'check' && '✓'}
                    </span>
                    <div>
                      <span className="font-medium">{feature.title}</span>
                      <span className="text-muted-foreground text-sm mr-2">- {feature.desc}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      features: prev.features.filter((_, i) => i !== index),
                    }))}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {formData.features.length === 0 && (
            <div className="text-center py-4 border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-sm">لم تضف أي ميزات بعد</p>
              <p className="text-xs text-muted-foreground mt-1">أضف ميزات مثل: شحن سريع، ضمان الجودة، إرجاع سهل</p>
            </div>
          )}
        </div>
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
