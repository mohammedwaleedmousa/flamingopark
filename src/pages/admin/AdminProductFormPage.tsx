import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowRight, Loader2, Upload, X, LayoutGrid, Plus, Trash2, Truck, Shield, RotateCcw, GripVertical, ZoomIn, Move } from 'lucide-react';
import ColorVariantsEditor, { ColorVariant } from '@/components/admin/ColorVariantsEditor';

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
  parent_id: string | null;
  is_active: boolean | null;
}

interface BrandCategoryRow {
  brand_id: string;
}

interface Accessory {
  name: string;
  name_ar: string;
  price: number;
  image_url?: string;
  description?: string;
  description_ar?: string;
}

interface ProductFeature {
  icon: string;
  title: string;
  desc: string;
}

const AdminProductFormPage = () => {
  const SINGLE_COUNTRY = 'GLOBAL';
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
    cost_price: '',
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
    countries: [SINGLE_COUNTRY] as string[],
    images: [] as string[],
    section_ids: [] as string[],
    has_sizes: false,
    sizes: [] as string[],
    accessories: [] as Accessory[],
    features: [] as ProductFeature[],
    color_variants: [] as ColorVariant[],
    stock_quantity: '0',
    image_zoom: 1,
    image_position_x: 50,
    image_position_y: 50,
    return_policy: '',
    specs: [] as { label: string; value: string }[],
    has_quality_variants: false,
    quality_variants: [] as { name: string; price: number; description: string; images: string[]; in_stock: boolean }[],
  });

  const [newSize, setNewSize] = useState('');
  const [newAccessory, setNewAccessory] = useState({ name: '', name_ar: '', price: '', image_url: '', description: '', description_ar: '' });
  const [newFeature, setNewFeature] = useState({ icon: 'truck', title: '', desc: '' });
  const [newSpec, setNewSpec] = useState({ label: '', value: '' });
  const [newQuality, setNewQuality] = useState({ name: '', price: '', description: '' });
  const [uploadingQualityIdx, setUploadingQualityIdx] = useState<number | null>(null);
  const [uploadingAccessoryImage, setUploadingAccessoryImage] = useState(false);
  const [selectedParentSlug, setSelectedParentSlug] = useState('');

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
        .select('id, name, name_ar, slug, parent_id, is_active')
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

  const selectedCategory = categories.find((c) => c.slug === formData.category) || null;

  const { data: mappedBrandRows = [] } = useQuery({
    queryKey: ['category-brand-links', selectedCategory?.id],
    enabled: !!selectedCategory,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brand_categories')
        .select('brand_id')
        .eq('category_id', selectedCategory!.id);
      if (error) throw error;
      return (data || []) as BrandCategoryRow[];
    },
  });

  const mappedBrandIds = useMemo(() => new Set(mappedBrandRows.map((r) => r.brand_id)), [mappedBrandRows]);

  const filteredBrands = useMemo(() => {
    if (mappedBrandIds.size === 0) return brands;
    return brands.filter((b: any) => mappedBrandIds.has(b.id));
  }, [brands, mappedBrandIds]);

  useEffect(() => {
    if (isEditing) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!categories.length || !formData.category) return;
    const category = categories.find((c) => c.slug === formData.category);
    if (!category) return;

    if (category.parent_id) {
      const parent = categories.find((c) => c.id === category.parent_id);
      setSelectedParentSlug(parent?.slug || '');
    } else {
      setSelectedParentSlug(category.slug);
    }
  }, [categories, formData.category]);

  useEffect(() => {
    if (!formData.brand) return;
    if (filteredBrands.length === 0) return;
    const exists = filteredBrands.some((b: any) => b.name?.trim() === formData.brand);
    if (!exists) {
      setFormData((prev) => ({ ...prev, brand: filteredBrands[0].name?.trim() || '' }));
    }
  }, [filteredBrands, formData.brand]);

  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  const selectedParentCategory = useMemo(
    () => parentCategories.find((c) => c.slug === selectedParentSlug) || null,
    [parentCategories, selectedParentSlug],
  );

  const subCategoriesForSelectedParent = useMemo(() => {
    if (!selectedParentCategory) return [];
    return categories.filter((c) => c.parent_id === selectedParentCategory.id);
  }, [categories, selectedParentCategory]);

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
        cost_price: data.cost_price?.toString() || '',
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
        countries: data.countries || [SINGLE_COUNTRY],
        images: data.images || [],
        section_ids: (data as any).section_ids || [],
        has_sizes: (data as any).has_sizes ?? false,
        sizes: (data as any).sizes || [],
        accessories: ((data as any).accessories || []) as Accessory[],
        features: ((data as any).features || []) as ProductFeature[],
        color_variants: ((data as any).color_variants || []) as ColorVariant[],
        stock_quantity: (data as any).stock_quantity?.toString() || '0',
        image_zoom: 1,
        image_position_x: 50,
        image_position_y: 50,
        return_policy: (data as any).return_policy || '',
        specs: ((data as any).specs || []) as { label: string; value: string }[],
        has_quality_variants: (data as any).has_quality_variants ?? false,
        quality_variants: ((data as any).quality_variants || []) as { name: string; price: number; description: string; images: string[]; in_stock: boolean }[],
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

  const handleImageUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const files = e.target.files;

  if (!files || files.length === 0) return;

  try {
    for (const file of Array.from(files)) {

      const ext = file.name.split(".").pop();

      const fileName = `${Date.now()}.${ext}`;

      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file);

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError);

        toast({
          title: "خطأ",
          description: uploadError.message,
          variant: "destructive",
        });

        continue;
      }


      const { data } = supabase.storage
        .from("uploads")
        .getPublicUrl(filePath);


      console.log("IMAGE URL:", data.publicUrl);


      setFormData((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          data.publicUrl,
        ],
      }));
    }

    toast({
      title: "تم",
      description: "تم رفع الصور بنجاح",
    });

  } catch (error: any) {

    console.error(error);

    toast({
      title: "خطأ",
      description: error.message,
      variant: "destructive",
    });
  }
};

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formData.images.length) return;
    setFormData(prev => {
      const newImages = [...prev.images];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return { ...prev, images: newImages };
    });
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
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة (الاسم، السعر، الفئة)', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const stockQty = Math.max(0, parseInt(formData.stock_quantity || '0') || 0);
    const productData = {
      name: formData.name,
      name_ar: formData.name_ar,
      slug: formData.slug || generateSlug(formData.name),
      price: parseFloat(formData.price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      discount: parseInt(formData.discount) || 0,
      description: formData.description,
      description_ar: formData.description_ar,
      category: formData.category,
      brand: formData.brand,
      in_stock: stockQty > 0 ? formData.in_stock : false,
      stock_quantity: stockQty,
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
      color_variants: formData.color_variants as unknown as any,
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
        const { data: inserted, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        if (!inserted) throw new Error('لم يتم إنشاء المنتج (استجابة فارغة)');
        toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
      }
      navigate('/admin/products');
    } catch (error: any) {
      const desc = error?.message || error?.details || error?.hint || 'فشل حفظ المنتج';
      console.error('[product-save] error:', error);
      toast({ title: 'خطأ في حفظ المنتج', description: desc, variant: 'destructive' });
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">سعر البيع *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">السعر الذي يظهر للعميل</p>
            </div>
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">سعر التكلفة *</label>
              <Input
                type="number"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">السعر الأصلي (التكلفة) - الخصومات تُطبق على هذا السعر</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">السعر قبل الخصم (للعرض)</label>
              <Input
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">يظهر مشطوباً بجانب السعر الحالي</p>
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
          
          {/* Profit Calculator */}
          {formData.price && formData.cost_price && (
            <div className="bg-muted/50 border border-border rounded p-4">
              <h3 className="text-sm font-heading text-foreground mb-2">حاسبة الربح</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">سعر البيع:</span>
                  <span className="text-foreground font-bold mr-2">{parseFloat(formData.price).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">التكلفة:</span>
                  <span className="text-foreground font-bold mr-2">{parseFloat(formData.cost_price).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الربح:</span>
                  <span className="text-green-500 font-bold mr-2">
                    {(parseFloat(formData.price) - parseFloat(formData.cost_price)).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({(((parseFloat(formData.price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">القسم الرئيسي *</label>
              <Select
                value={selectedParentSlug}
                onValueChange={(value) => {
                  setSelectedParentSlug(value);
                  const nextParent = parentCategories.find((c) => c.slug === value);
                  const children = nextParent ? categories.filter((c) => c.parent_id === nextParent.id) : [];
                  setFormData({
                    ...formData,
                    category: children.length ? children[0].slug : value,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم الرئيسي" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name_ar} ({cat.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">القسم الفرعي</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={subCategoriesForSelectedParent.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subCategoriesForSelectedParent.length ? 'اختر القسم الفرعي' : 'لا توجد أقسام فرعية'} />
                </SelectTrigger>
                <SelectContent>
                  {subCategoriesForSelectedParent.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name_ar} ({cat.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                إذا لم توجد أقسام فرعية سيتم حفظ المنتج مباشرة داخل القسم الرئيسي.
              </p>
            </div>

            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">الماركة (اختياري)</label>
              <Select
                value={formData.brand || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, brand: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون ماركة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون ماركة</SelectItem>
                  {filteredBrands.map((brand: any) => (
                    <SelectItem key={brand.id} value={brand.name.trim()}>
                      {brand.name.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {mappedBrandIds.size > 0
                  ? 'يتم عرض الماركات المربوطة بهذا القسم فقط.'
                  : 'لا يوجد ربط محدد للقسم، لذلك تظهر كل الماركات.'}
              </p>
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
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-foreground">الصور</h2>
            <span className="text-xs text-muted-foreground">اسحب الصورة لتغيير ترتيبها • الصورة الأولى هي الرئيسية</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {formData.images.map((img, index) => (
              <div 
                key={img} 
                className={`relative w-24 h-24 group overflow-hidden ${index === 0 ? 'ring-2 ring-gold ring-offset-2 ring-offset-background' : ''}`}
              >
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full rounded" 
                  style={{
                    objectFit: 'cover',
                    transform: `scale(${formData.image_zoom})`,
                    objectPosition: `${formData.image_position_x}% ${formData.image_position_y}%`,
                  }}
                />
                
                {/* Main image badge */}
                {index === 0 && (
                  <span className="absolute -top-1 -left-1 bg-gold text-secondary text-[10px] px-1.5 py-0.5 rounded font-bold z-10">
                    رئيسية
                  </span>
                )}
                
                {/* Move buttons */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 p-1 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 text-xs bg-muted rounded hover:bg-muted-foreground/20 disabled:opacity-30"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    disabled={index === formData.images.length - 1}
                    className="p-1 text-xs bg-muted rounded hover:bg-muted-foreground/20 disabled:opacity-30"
                  >
                    ▶
                  </button>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
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

          {/* Image Zoom & Position Controls */}
          {formData.images.length > 0 && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-foreground">تحكم في عرض الصور</p>
              
              {/* Zoom */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  <label className="text-xs text-muted-foreground">التكبير: {formData.image_zoom.toFixed(1)}x</label>
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
                  <label className="text-xs text-muted-foreground">الموضع الأفقي: {formData.image_position_x}%</label>
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
                  <label className="text-xs text-muted-foreground">الموضع العمودي: {formData.image_position_y}%</label>
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
                type="button"
                variant="outline" 
                size="sm"
                onClick={() => setFormData({ ...formData, image_zoom: 1, image_position_x: 50, image_position_y: 50 })}
              >
                إعادة تعيين الموضع
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-card border border-border rounded p-6 space-y-4">
          <h2 className="font-heading text-lg text-foreground">الإعدادات</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-2">
                الكمية في المخزون *
              </label>
              <Input
                type="number"
                min={0}
                value={formData.stock_quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = Math.max(0, parseInt(v || '0') || 0);
                  setFormData({
                    ...formData,
                    stock_quantity: v,
                    in_stock: n > 0 ? formData.in_stock : false,
                  });
                }}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                عند وصول الكمية إلى 0 سيصبح المنتج غير متوفر تلقائياً وسيُخصم عند كل طلب.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.in_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, in_stock: !!checked })}
                disabled={(parseInt(formData.stock_quantity || '0') || 0) === 0}
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
            <label className="block text-sm font-body text-muted-foreground mb-2">النطاق</label>
            <p className="text-sm text-muted-foreground">المنتج سيظهر في المتجر الموحد</p>
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
                placeholder="الاسم (عربي) *"
                dir="rtl"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Textarea
                value={newAccessory.description_ar}
                onChange={(e) => setNewAccessory(prev => ({ ...prev, description_ar: e.target.value }))}
                placeholder="وصف الملحق (عربي)"
                dir="rtl"
                rows={2}
              />
              <Input
                type="number"
                value={newAccessory.price}
                onChange={(e) => setNewAccessory(prev => ({ ...prev, price: e.target.value }))}
                placeholder="السعر الإضافي *"
              />
            </div>

            <div className="flex gap-3 items-center">
              {newAccessory.image_url ? (
                <div className="relative w-16 h-16 flex-shrink-0">
                  <img src={newAccessory.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setNewAccessory(prev => ({ ...prev, image_url: '' }))}
                    className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex-1 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-gold transition-colors">
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
                size="lg"
                onClick={() => {
                  if (newAccessory.name_ar.trim() && newAccessory.price) {
                    setFormData(prev => ({
                      ...prev,
                      accessories: [...prev.accessories, {
                        name: newAccessory.name.trim(),
                        name_ar: newAccessory.name_ar.trim(),
                        price: parseFloat(newAccessory.price),
                        image_url: newAccessory.image_url || undefined,
                        description: newAccessory.description || undefined,
                        description_ar: newAccessory.description_ar.trim() || undefined,
                      }],
                    }));
                    setNewAccessory({ name: '', name_ar: '', price: '', image_url: '', description: '', description_ar: '' });
                  }
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </div>
          </div>

          {formData.accessories.length > 0 && (
            <div className="space-y-2">
              {formData.accessories.map((acc, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    {acc.image_url && (
                      <img src={acc.image_url} alt={acc.name_ar} className="w-14 h-14 object-cover rounded-lg" />
                    )}
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">{acc.name_ar}</span>
                        {acc.name && <span className="text-muted-foreground text-sm mr-2">({acc.name})</span>}
                      </div>
                      {acc.description_ar && (
                        <p className="text-sm text-muted-foreground">{acc.description_ar}</p>
                      )}
                      <span className="text-gold font-heading text-lg">+{acc.price}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      accessories: prev.accessories.filter((_, i) => i !== index),
                    }))}
                    className="text-destructive hover:text-destructive/80 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
        {/* Color Variants */}
        <ColorVariantsEditor
          value={formData.color_variants}
          onChange={(v) => setFormData((prev) => ({ ...prev, color_variants: v }))}
        />
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
