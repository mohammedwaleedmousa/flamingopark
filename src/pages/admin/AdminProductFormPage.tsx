import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Boxes, Check, ChevronLeft, CircleDollarSign, ClipboardList, Eye, ImagePlus, Layers3, LayoutGrid, Loader2, Package, PackageCheck, Plus, RotateCcw, Save, Settings2, Shield, Sparkles, Store, Tag, Trash2, Truck, Upload, X, type LucideIcon } from 'lucide-react';
import type { ColorVariant } from '@/components/admin/ColorVariantsEditor';
import { cn } from '@/lib/utils';

const ColorVariantsEditor = lazy(() => import('@/components/admin/ColorVariantsEditor'));

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

const prepareImage = async (file: File) => {
  const { prepareImageUpload } = await import('@/lib/prepareImageUpload');
  return prepareImageUpload(file);
};

const parseLocalizedNumber = (value: string) => Number(
  value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[,،]/g, '.'),
);

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
    section_ids: [] as string[],
    home_collections: [] as string[],
    accessories: [] as Accessory[],
    features: [] as ProductFeature[],
    color_variants: [] as ColorVariant[],
    stock_quantity: '0',
    return_policy: '',
    specs: [] as { label: string; value: string }[],
    has_quality_variants: false,
    quality_variants: [] as { name: string; price: number; description: string; images: string[]; in_stock: boolean }[],
  });

  const [newAccessory, setNewAccessory] = useState({ name: '', name_ar: '', price: '', image_url: '', description: '', description_ar: '' });
  const [newFeature, setNewFeature] = useState({ icon: 'truck', title: '', desc: '' });
  const [newSpec, setNewSpec] = useState({ label: '', value: '' });
  const [newQuality, setNewQuality] = useState({ name: '', price: '', description: '' });
  const [uploadingQualityIdx, setUploadingQualityIdx] = useState<number | null>(null);
  const [uploadingAccessoryImage, setUploadingAccessoryImage] = useState(false);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
    || categories.find((c) => c.slug === formData.category)
    || null;

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
    if (!categories.length || (!formData.category && !selectedCategoryId)) return;
    const category = categories.find((c) => c.id === selectedCategoryId)
      || categories.find((c) => c.slug === formData.category);
    if (!category) return;

    if (formData.category !== category.slug) {
      setFormData((current) => ({ ...current, category: category.slug }));
    }

    if (category.parent_id) {
      const parent = categories.find((c) => c.id === category.parent_id);
      setSelectedParentCategoryId(parent?.id || '');
    } else {
      setSelectedParentCategoryId(category.id);
    }
  }, [categories, formData.category, selectedCategoryId]);

  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  const selectedParentCategory = useMemo(
    () => parentCategories.find((c) => c.id === selectedParentCategoryId) || null,
    [parentCategories, selectedParentCategoryId],
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
      setSelectedCategoryId(data.category_id || null);
      let brandName = data.brand?.trim() || '';
      if (!brandName && data.brand_id) {
        const { data: registeredBrand } = await supabase
          .from('brands')
          .select('name')
          .eq('id', data.brand_id)
          .maybeSingle();
        brandName = registeredBrand?.name?.trim() || '';
      }
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
        brand: brandName,
        in_stock: data.in_stock ?? true,
        is_featured: data.is_featured ?? false,
        is_best_seller: data.is_best_seller ?? false,
        is_active: data.is_active ?? true,
        countries: data.countries || [SINGLE_COUNTRY],
        section_ids: (data as any).section_ids || [],
        home_collections: (data as any).home_collections || [],
        accessories: ((data as any).accessories || []) as Accessory[],
        features: ((data as any).features || []) as ProductFeature[],
        color_variants: ((data as any).color_variants || []) as ColorVariant[],
        stock_quantity: (data as any).stock_quantity?.toString() || '0',
        return_policy: (data as any).return_policy || '',
        specs: ((data as any).specs || []) as { label: string; value: string }[],
        has_quality_variants: (data as any).has_quality_variants ?? false,
        quality_variants: ((data as any).quality_variants || []) as { name: string; price: number; description: string; images: string[]; in_stock: boolean }[],
      });
    }
    setIsLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setFormData({
      ...formData,
      name: value,
      slug: generateSlug(value),
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

  const toggleHomeCollection = (collection: string) => {
    setFormData((prev) => ({
      ...prev,
      home_collections: prev.home_collections.includes(collection)
        ? prev.home_collections.filter((item) => item !== collection)
        : [...prev.home_collections, collection],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const resolvedName = formData.name.trim() || formData.name_ar.trim();
    const resolvedSlug = formData.slug.trim() || generateSlug(resolvedName);
    const resolvedCategory = formData.category || selectedParentCategory?.slug || '';
    const price = parseLocalizedNumber(formData.price);
    const missingFields = [
      !resolvedName && 'الاسم',
      !formData.name_ar.trim() && 'الاسم العربي',
      !Number.isFinite(price) && 'سعر البيع',
      price < 0 && 'سعر البيع',
      !resolvedCategory && 'القسم الرئيسي',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      toast({ title: 'حقول مطلوبة', description: `أكمل: ${missingFields.join('، ')}`, variant: 'destructive' });
      return;
    }

    if (!resolvedSlug) {
      toast({ title: 'خطأ', description: 'أدخل رابطاً صالحاً للمنتج', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const stockQty = formData.color_variants.length > 0
      ? formData.color_variants.reduce((total, color) => {
          const sizes = color.sizes || [];
          return total + (sizes.length > 0
            ? sizes.reduce((colorTotal, entry) => colorTotal + (typeof entry === 'string' ? 0 : entry.stock || 0), 0)
            : color.stock || 0);
        }, 0)
      : Math.max(0, parseInt(formData.stock_quantity || '0') || 0);
    const selectedCat = categories.find((c) => c.id === selectedCategoryId)
      || categories.find((c) => c.slug === resolvedCategory)
      || null;
    const brandName = formData.brand.trim();
    const selectedBrand = (brands as any[]).find((b: any) => b.name?.trim() === brandName) || null;
    const productData = {
      name: resolvedName,
      name_ar: formData.name_ar,
      slug: resolvedSlug,
      price,
      cost_price: formData.cost_price ? parseLocalizedNumber(formData.cost_price) || 0 : 0,
      original_price: formData.original_price ? parseLocalizedNumber(formData.original_price) || null : null,
      discount: parseLocalizedNumber(formData.discount) || 0,
      description: formData.description,
      description_ar: formData.description_ar,
      category: selectedCat?.slug || resolvedCategory || null,
      brand: brandName || null,
      category_id: selectedCat?.id ?? null,
      brand_id: selectedBrand?.id ?? null,
      in_stock: stockQty > 0 ? formData.in_stock : false,
      stock_quantity: stockQty,
      is_featured: formData.is_featured,
      is_best_seller: formData.is_best_seller,
      is_active: formData.is_active,
      countries: formData.countries,
      section_ids: formData.section_ids,
      home_collections: formData.home_collections,
      has_sizes: formData.color_variants.some((color) => (color.sizes || []).length > 0),
      sizes: [],
      accessories: formData.accessories as unknown as any,
      features: formData.features as unknown as any,
      color_variants: formData.color_variants as unknown as any,
      return_policy: formData.return_policy || null,
      specs: formData.specs as unknown as any,
      has_quality_variants: formData.has_quality_variants,
      quality_variants: formData.quality_variants as unknown as any,
    };

    try {
      if (isEditing) {
        const { data: savedProduct, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
          .select('category,category_id')
          .single();
        if (error) throw error;
        if (savedProduct.category_id !== selectedCat?.id) {
          throw new Error('لم يتم حفظ القسم الفرعي المحدد. أعد اختيار القسم ثم احفظ مرة أخرى.');
        }
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


  const salesPrice = parseLocalizedNumber(formData.price);
  const costPrice = parseLocalizedNumber(formData.cost_price);
  const profitValue = Number.isFinite(salesPrice) && Number.isFinite(costPrice) ? salesPrice - costPrice : 0;
  const marginValue = Number.isFinite(costPrice) && costPrice > 0 ? (profitValue / costPrice) * 100 : 0;
  const totalVariantStock = formData.color_variants.reduce((total, color) => {
    const sizes = color.sizes || [];
    return total + (sizes.length > 0 ? sizes.reduce((sum, entry) => sum + (typeof entry === 'string' ? 0 : Number(entry.stock || 0)), 0) : Number(color.stock || 0));
  }, 0);
  const visibleStock = formData.color_variants.length > 0 ? totalVariantStock : Math.max(0, parseInt(formData.stock_quantity || '0') || 0);
  const requiredFieldsReady = Boolean((formData.name.trim() || formData.name_ar.trim()) && formData.name_ar.trim() && Number.isFinite(salesPrice) && salesPrice >= 0 && (formData.category || selectedParentCategory?.slug));

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] w-full items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" strokeWidth={1.8} />
          </div>
          <p className="mt-3 text-[9px] font-medium text-[#969DA7]">جاري تحميل بيانات المنتج...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-4" dir="rtl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex flex-col gap-4 border-b border-[#E5E9EF] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-[10px]">
            <button type="button" onClick={() => navigate('/admin/products')} className="mt-[1px] flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[#E3E7EC] bg-white text-[#6E7681] transition-colors hover:border-[#D9DEE5] hover:bg-[#F8FAFC] hover:text-[#4E5661]">
              <ArrowRight className="h-[14px] w-[14px]" strokeWidth={1.8} />
            </button>

            <div className="min-w-0">
              <div className="mb-[6px] flex items-center gap-[6px]">
                <span className="h-[6px] w-[6px] rounded-full bg-[#675CBA]" />
                <span className="text-[7.5px] font-bold tracking-[0.06em] text-[#999FA9]">{isEditing ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</span>
              </div>
              <h1 className="text-[22px] font-bold leading-tight tracking-[-0.45px] text-[#20252E] md:text-[24px]">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h1>
              <p className="mt-[6px] max-w-[650px] text-[9.5px] font-medium leading-5 text-[#8F97A2]">إدارة معلومات المنتج والتسعير والتصنيف والمخزون وخيارات الظهور من شاشة واحدة.</p>
            </div>
          </div>

          <div className="flex items-center gap-[7px]">
            <button type="button" onClick={() => navigate('/admin/products')} className="flex h-[38px] items-center justify-center rounded-[10px] border border-[#E2E6EB] bg-white px-[13px] text-[9px] font-semibold text-[#69717C] transition-colors hover:bg-[#F8FAFC]">إلغاء</button>
            <Button type="submit" disabled={isSaving} className="h-[38px] gap-[6px] rounded-[10px] bg-[#675CBA] px-[14px] text-[9px] font-semibold text-white shadow-none hover:bg-[#594FAB]">
              {isSaving ? <Loader2 className="h-[12px] w-[12px] animate-spin" /> : <Save className="h-[12px] w-[12px]" strokeWidth={1.8} />}
              {isSaving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </Button>
          </div>
        </header>

        {/* =====================================================
            FORM GRID
        ===================================================== */}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
          {/* ===================================================
              MAIN COLUMN
          =================================================== */}

          <div className="min-w-0 space-y-4">
            {/* BASIC INFORMATION */}

            <FormSection icon={Package} tone="indigo" title="المعلومات الأساسية" description="الاسم والرابط والوصف الذي سيظهر للعميل.">
              <div className="grid grid-cols-1 gap-[11px] md:grid-cols-2">
                <Field label="الاسم بالعربي" required>
                  <Input value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} placeholder="اسم المنتج" dir="rtl" className={inputClass} />
                </Field>

                <Field label="الاسم بالإنجليزي">
                  <Input value={formData.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Product name" dir="ltr" className={cn(inputClass, "text-left")} />
                </Field>
              </div>

              <Field label="الرابط المختصر" helper="يتم إنشاؤه تلقائيًا من الاسم الإنجليزي ويمكن تعديله.">
                <div className="relative">
                  <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="product-name" dir="ltr" className={cn(inputClass, "pl-[78px] text-left")} />
                  <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 rounded-[6px] bg-[#EEF1F4] px-[6px] py-[3px] text-[6.5px] font-semibold text-[#969DA7]">SLUG</span>
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-[11px] md:grid-cols-2">
                <Field label="الوصف بالعربي">
                  <Textarea value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} rows={4} dir="rtl" placeholder="وصف مختصر وواضح للمنتج..." className={textareaClass} />
                </Field>

                <Field label="الوصف بالإنجليزي">
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} dir="ltr" placeholder="Product description..." className={cn(textareaClass, "text-left")} />
                </Field>
              </div>
            </FormSection>

            {/* PRICING */}

            <FormSection icon={CircleDollarSign} tone="green" title="التسعير والربحية" description="حدد سعر البيع والتكلفة والخصم بطريقة واضحة.">
              <div className="grid grid-cols-1 gap-[11px] md:grid-cols-2">
                <Field label="سعر البيع" required helper="السعر الحالي الذي يظهر للعميل.">
                  <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} onWheel={(e) => e.currentTarget.blur()} placeholder="0.00" className={inputClass} />
                </Field>

                <Field label="سعر التكلفة" helper="يستخدم لحساب هامش الربح داخل لوحة الإدارة.">
                  <Input type="number" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} onWheel={(e) => e.currentTarget.blur()} placeholder="0.00" className={inputClass} />
                </Field>

                <Field label="السعر قبل الخصم" helper="يظهر مشطوبًا بجانب سعر البيع عند توفره.">
                  <Input type="number" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} onWheel={(e) => e.currentTarget.blur()} placeholder="0.00" className={inputClass} />
                </Field>

                <Field label="نسبة الخصم">
                  <div className="relative">
                    <Input type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} onWheel={(e) => e.currentTarget.blur()} placeholder="0" className={cn(inputClass, "pl-10")} />
                    <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#979EA8]">%</span>
                  </div>
                </Field>
              </div>

              {(formData.price || formData.cost_price) && (
                <div className="grid grid-cols-3 gap-[7px] rounded-[12px] border border-[#E7EBEF] bg-[#FAFBFC] p-[9px]">
                  <MiniValue label="سعر البيع" value={Number.isFinite(salesPrice) ? salesPrice.toFixed(2) : '—'} tone="indigo" />
                  <MiniValue label="التكلفة" value={Number.isFinite(costPrice) ? costPrice.toFixed(2) : '—'} tone="slate" />
                  <MiniValue label="الربح" value={Number.isFinite(profitValue) ? profitValue.toFixed(2) : '—'} helper={costPrice > 0 ? `${marginValue.toFixed(1)}%` : undefined} tone={profitValue >= 0 ? 'green' : 'coral'} />
                </div>
              )}
            </FormSection>

            {/* CATALOG */}

            <FormSection icon={Layers3} tone="blue" title="التصنيف والماركة" description="اربط المنتج بالقسم الصحيح والماركة المسجلة.">
              <div className="grid grid-cols-1 gap-[11px] md:grid-cols-2">
                <Field label="القسم الرئيسي" required>
                  <Select value={selectedParentCategoryId} onValueChange={(value) => { const category = parentCategories.find((item) => item.id === value) || null; setSelectedParentCategoryId(value); setSelectedCategoryId(category?.id || null); setFormData((current) => ({ ...current, category: category?.slug || '' })); }}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="اختر القسم الرئيسي" /></SelectTrigger>
                    <SelectContent>
                      {parentCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name_ar} ({cat.name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="القسم الفرعي" helper={subCategoriesForSelectedParent.length ? "اختياري — اختر القسم الأدق للمنتج." : "لا توجد أقسام فرعية لهذا القسم."}>
                  <Select value={subCategoriesForSelectedParent.some((category) => category.id === selectedCategoryId) ? selectedCategoryId || '' : ''} onValueChange={(value) => { const category = subCategoriesForSelectedParent.find((item) => item.id === value) || null; setSelectedCategoryId(category?.id || null); setFormData((current) => ({ ...current, category: category?.slug || selectedParentCategory?.slug || '' })); }} disabled={subCategoriesForSelectedParent.length === 0}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder={subCategoriesForSelectedParent.length ? 'اختر القسم الفرعي' : 'لا توجد أقسام فرعية'} /></SelectTrigger>
                    <SelectContent>
                      {subCategoriesForSelectedParent.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name_ar} ({cat.name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="الماركة" helper="يمكن كتابة اسم حر؛ يتم ربطه بصفحة ماركة فقط عند مطابقة ماركة مسجلة.">
                <div className="relative">
                  <Tag className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#989FA9]" strokeWidth={1.7} />
                  <Input value={formData.brand} onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))} placeholder="اكتب اسم الماركة أو اختر من الاقتراحات" list="registered-brands" className={cn(inputClass, "pr-[36px]")} />
                  <datalist id="registered-brands">{filteredBrands.map((brand: any) => <option key={brand.id} value={brand.name.trim()} />)}</datalist>
                </div>
              </Field>
            </FormSection>

            {/* INVENTORY */}

            {formData.color_variants.length === 0 && (
              <FormSection icon={Boxes} tone="amber" title="مخزون المنتج" description="استخدم الكمية المباشرة للمنتجات التي لا تحتوي على ألوان أو مقاسات.">
                <div className="grid grid-cols-1 gap-[11px] md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
                  <Field label="الكمية المتاحة">
                    <Input type="number" min={0} value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} placeholder="0" className={inputClass} />
                  </Field>

                  <div className="flex h-[40px] items-center justify-between rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] px-[11px]">
                    <span className="text-[8px] font-medium text-[#9097A1]">الحالة</span>
                    <span className={cn("inline-flex items-center gap-[5px] rounded-[7px] px-[7px] py-[4px] text-[7px] font-semibold", visibleStock > 0 ? "bg-[#EAF7EE] text-[#57906A]" : "bg-[#FFF0F0] text-[#C76161]")}><span className={cn("h-[5px] w-[5px] rounded-full", visibleStock > 0 ? "bg-[#629067]" : "bg-[#D06A5E]")} />{visibleStock > 0 ? `${visibleStock} متوفر` : 'نفد المخزون'}</span>
                  </div>
                </div>
              </FormSection>
            )}

            {/* COLOR VARIANTS */}

            <FormSection icon={Sparkles} tone="violet" title="الألوان والمقاسات" description="أضف ألوان المنتج وصوره والمقاسات والكميات الخاصة بكل خيار.">
              <Suspense fallback={<div className="h-[180px] animate-pulse rounded-[12px] border border-[#E7EAEF] bg-[#F8FAFC]" />}>
                <ColorVariantsEditor value={formData.color_variants} onChange={(v) => setFormData((prev) => ({ ...prev, color_variants: v }))} />
              </Suspense>

              {formData.color_variants.length > 0 && (
                <div className="mt-[10px] flex items-center justify-between rounded-[10px] border border-[#E6EAEF] bg-[#FAFBFC] px-[10px] py-[8px]">
                  <div>
                    <p className="text-[8px] font-semibold text-[#5D6570]">إجمالي مخزون الخيارات</p>
                    <p className="mt-[2px] text-[6.5px] text-[#A0A6AF]">{formData.color_variants.length} لون / خيار مسجل</p>
                  </div>
                  <span dir="ltr" className="text-[16px] font-semibold text-[#675CBA]">{totalVariantStock}</span>
                </div>
              )}
            </FormSection>

            {/* ACCESSORIES */}

            <FormSection icon={Plus} tone="rose" title="الملحقات الإضافية" description="ملحقات اختيارية يستطيع العميل إضافتها للمنتج مقابل سعر إضافي.">
              <div className="rounded-[12px] border border-[#E7EAEF] bg-[#FAFBFC] p-[10px]">
                <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2">
                  <Input value={newAccessory.name_ar} onChange={(e) => setNewAccessory((prev) => ({ ...prev, name_ar: e.target.value }))} placeholder="اسم الملحق بالعربي *" dir="rtl" className={inputClass} />
                  <Input value={newAccessory.name} onChange={(e) => setNewAccessory((prev) => ({ ...prev, name: e.target.value }))} placeholder="Accessory name" dir="ltr" className={cn(inputClass, "text-left")} />
                  <Input type="number" value={newAccessory.price} onChange={(e) => setNewAccessory((prev) => ({ ...prev, price: e.target.value }))} placeholder="السعر الإضافي *" className={inputClass} />
                  <Textarea value={newAccessory.description_ar} onChange={(e) => setNewAccessory((prev) => ({ ...prev, description_ar: e.target.value }))} placeholder="وصف الملحق (اختياري)" dir="rtl" rows={2} className={textareaClass} />
                </div>

                <div className="mt-[8px] flex flex-col gap-[8px] sm:flex-row sm:items-center">
                  {newAccessory.image_url ? (
                    <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[10px] border border-[#E3E7EC] bg-white">
                      <img loading="lazy" src={newAccessory.image_url} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setNewAccessory((prev) => ({ ...prev, image_url: '' }))} className="absolute left-[3px] top-[3px] flex h-[18px] w-[18px] items-center justify-center rounded-[6px] bg-white/95 text-[#C76161]"><X className="h-[9px] w-[9px]" /></button>
                    </div>
                  ) : (
                    <label className="flex h-[40px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-[10px] border border-dashed border-[#D7DCE3] bg-white text-[8px] font-semibold text-[#7D858F] transition-colors hover:border-[#CFC9E7] hover:text-[#675CBA]">
                      {uploadingAccessoryImage ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : <Upload className="h-[11px] w-[11px]" strokeWidth={1.7} />}
                      {uploadingAccessoryImage ? 'جاري رفع الصورة...' : 'إضافة صورة للملحق'}
                      <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAccessoryImage(true);
                        try {
                          const prepared = await prepareImage(file);
                          const path = `accessories/${Date.now()}-${prepared.name}`;
                          const { error } = await supabase.storage.from('uploads').upload(path, prepared, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
                          if (error) throw error;
                          const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
                          setNewAccessory((prev) => ({ ...prev, image_url: urlData.publicUrl }));
                        } catch (err: any) {
                          toast({ title: 'فشل رفع الصورة', description: err?.message, variant: 'destructive' });
                        } finally {
                          setUploadingAccessoryImage(false);
                          e.target.value = '';
                        }
                      }} />
                    </label>
                  )}

                  <button type="button" onClick={() => {
                    if (!newAccessory.name_ar.trim() || !newAccessory.price) return;
                    setFormData((prev) => ({ ...prev, accessories: [...prev.accessories, { name: newAccessory.name.trim(), name_ar: newAccessory.name_ar.trim(), price: parseFloat(newAccessory.price), image_url: newAccessory.image_url || undefined, description: newAccessory.description || undefined, description_ar: newAccessory.description_ar.trim() || undefined }] }));
                    setNewAccessory({ name: '', name_ar: '', price: '', image_url: '', description: '', description_ar: '' });
                  }} className="flex h-[40px] shrink-0 items-center justify-center gap-[6px] rounded-[10px] bg-[#675CBA] px-[12px] text-[8px] font-semibold text-white transition-colors hover:bg-[#594FAB]">
                    <Plus className="h-[11px] w-[11px]" />
                    إضافة الملحق
                  </button>
                </div>
              </div>

              {formData.accessories.length > 0 && (
                <div className="mt-[9px] grid grid-cols-1 gap-[7px] lg:grid-cols-2">
                  {formData.accessories.map((acc, index) => (
                    <div key={`${acc.name_ar}-${index}`} className="flex items-center gap-[9px] rounded-[11px] border border-[#E7EAEF] bg-white p-[8px]">
                      <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#F2F4F6]">
                        {acc.image_url ? <img loading="lazy" src={acc.image_url} alt={acc.name_ar} className="h-full w-full object-cover" /> : <ImagePlus className="h-[15px] w-[15px] text-[#A1A7B0]" strokeWidth={1.6} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[9px] font-semibold text-[#4C545E]">{acc.name_ar}</p>
                        {acc.description_ar && <p className="mt-[2px] truncate text-[6.5px] text-[#9DA4AD]">{acc.description_ar}</p>}
                        <p dir="ltr" className="mt-[4px] text-right text-[8px] font-semibold text-[#A76474]">+{acc.price.toLocaleString('en-US')}</p>
                      </div>
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, accessories: prev.accessories.filter((_, i) => i !== index) }))} className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C76161] transition-colors hover:bg-[#FFF3F1]"><Trash2 className="h-[11px] w-[11px]" /></button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            {/* FEATURES */}

            <FormSection icon={Truck} tone="cyan" title="ميزات الخدمة" description="معلومات مختصرة تظهر للعميل مثل الشحن أو الضمان أو الإرجاع.">
              <div className="grid grid-cols-1 gap-[8px] md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Select value={newFeature.icon} onValueChange={(value) => setNewFeature((prev) => ({ ...prev, icon: value }))}>
                  <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">الشحن</SelectItem>
                    <SelectItem value="shield">الضمان</SelectItem>
                    <SelectItem value="rotate">الإرجاع</SelectItem>
                  </SelectContent>
                </Select>

                <Input value={newFeature.title} onChange={(e) => setNewFeature((prev) => ({ ...prev, title: e.target.value }))} placeholder="العنوان" className={inputClass} />
                <Input value={newFeature.desc} onChange={(e) => setNewFeature((prev) => ({ ...prev, desc: e.target.value }))} placeholder="وصف قصير" className={inputClass} />

                <button type="button" onClick={() => {
                  if (!newFeature.title.trim()) return;
                  setFormData((prev) => ({ ...prev, features: [...prev.features, { icon: newFeature.icon, title: newFeature.title.trim(), desc: newFeature.desc.trim() }] }));
                  setNewFeature({ icon: 'truck', title: '', desc: '' });
                }} className="flex h-[40px] items-center justify-center gap-[5px] rounded-[10px] border border-[#D8E7EC] bg-[#F4FAFC] px-[10px] text-[8px] font-semibold text-[#4A8293] transition-colors hover:bg-[#EBF6FA]">
                  <Plus className="h-[10px] w-[10px]" />
                  إضافة
                </button>
              </div>

              {formData.features.length > 0 && (
                <div className="mt-[9px] grid grid-cols-1 gap-[7px] md:grid-cols-3">
                  {formData.features.map((feature, index) => {
                    const FeatureIcon = feature.icon === 'shield' ? Shield : feature.icon === 'rotate' ? RotateCcw : Truck;
                    return (
                      <div key={`${feature.title}-${index}`} className="flex items-start gap-[8px] rounded-[11px] border border-[#E5EBEE] bg-[#F8FBFC] p-[9px]">
                        <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-[#EAF7FB] text-[#4A90A6]"><FeatureIcon className="h-[12px] w-[12px]" strokeWidth={1.7} /></div>
                        <div className="min-w-0 flex-1"><p className="truncate text-[8.5px] font-semibold text-[#4B555D]">{feature.title}</p><p className="mt-[3px] line-clamp-2 text-[6.5px] leading-4 text-[#929AA3]">{feature.desc}</p></div>
                        <button type="button" onClick={() => setFormData((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }))} className="text-[#B1B7BE] transition-colors hover:text-[#C76161]"><X className="h-[10px] w-[10px]" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>

            {/* SPECS */}

            <FormSection icon={ClipboardList} tone="blue" title="المواصفات التفصيلية" description="المادة، الوزن، بلد الصنع وأي معلومات منظمة عن المنتج.">
              <div className="grid grid-cols-1 gap-[8px] md:grid-cols-[1fr_1fr_auto]">
                <Input value={newSpec.label} onChange={(e) => setNewSpec({ ...newSpec, label: e.target.value })} placeholder="التسمية — مثال: المادة" className={inputClass} />
                <Input value={newSpec.value} onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })} placeholder="القيمة — مثال: جلد طبيعي" className={inputClass} />
                <button type="button" onClick={() => { if (!newSpec.label.trim() || !newSpec.value.trim()) return; setFormData((prev) => ({ ...prev, specs: [...prev.specs, { label: newSpec.label.trim(), value: newSpec.value.trim() }] })); setNewSpec({ label: '', value: '' }); }} className="flex h-[40px] items-center justify-center gap-[5px] rounded-[10px] border border-[#DCE4F0] bg-[#F5F8FD] px-[11px] text-[8px] font-semibold text-[#5679A4] transition-colors hover:bg-[#EDF4FC]"><Plus className="h-[10px] w-[10px]" />إضافة</button>
              </div>

              {formData.specs.length > 0 && (
                <div className="mt-[9px] overflow-hidden rounded-[11px] border border-[#E7EAEF]">
                  {formData.specs.map((spec, index) => (
                    <div key={`${spec.label}-${index}`} className="grid grid-cols-[1fr_1fr_32px] items-center border-b border-[#EEF1F4] bg-white px-[10px] py-[8px] last:border-b-0">
                      <span className="truncate text-[8px] font-semibold text-[#535B65]">{spec.label}</span>
                      <span className="truncate text-[8px] text-[#7E8690]">{spec.value}</span>
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, specs: prev.specs.filter((_, i) => i !== index) }))} className="flex h-[25px] w-[25px] items-center justify-center rounded-[7px] text-[#A0A6AF] transition-colors hover:bg-[#FFF1F1] hover:text-[#C76161]"><Trash2 className="h-[10px] w-[10px]" /></button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            {/* QUALITY VARIANTS */}

            <FormSection icon={Sparkles} tone="violet" title="الجودات والخامات" description="استخدمها فقط عندما يكون لنفس المنتج أكثر من جودة بسعر أو صور مختلفة.">
              <ToggleRow checked={formData.has_quality_variants} onCheckedChange={(checked) => setFormData({ ...formData, has_quality_variants: checked })} icon={Sparkles} tone="violet" title="تفعيل الجودات المتعددة" description="سيتمكن العميل من الاختيار بين أكثر من جودة أو خامة." />

              {formData.has_quality_variants && (
                <div className="mt-[10px] space-y-[10px]">
                  <div className="rounded-[12px] border border-[#E8E4F0] bg-[#FAF8FF] p-[10px]">
                    <div className="grid grid-cols-1 gap-[8px] md:grid-cols-[minmax(0,1fr)_150px_auto]">
                      <Input value={newQuality.name} onChange={(e) => setNewQuality({ ...newQuality, name: e.target.value })} placeholder="اسم الجودة — مثال: ممتاز / A+" className={inputClass} />
                      <Input type="number" value={newQuality.price} onChange={(e) => setNewQuality({ ...newQuality, price: e.target.value })} placeholder="السعر" className={inputClass} />
                      <button type="button" onClick={() => {
                        if (!newQuality.name.trim() || !newQuality.price) return;
                        setFormData((prev) => ({ ...prev, quality_variants: [...prev.quality_variants, { name: newQuality.name.trim(), price: parseFloat(newQuality.price), description: newQuality.description.trim(), images: [], in_stock: true }] }));
                        setNewQuality({ name: '', price: '', description: '' });
                      }} className="flex h-[40px] items-center justify-center gap-[5px] rounded-[10px] bg-[#675CBA] px-[11px] text-[8px] font-semibold text-white hover:bg-[#594FAB]"><Plus className="h-[10px] w-[10px]" />إضافة جودة</button>
                    </div>

                    <Textarea rows={2} value={newQuality.description} onChange={(e) => setNewQuality({ ...newQuality, description: e.target.value })} placeholder="وصف الجودة الجديدة — اختياري" className={cn(textareaClass, "mt-[8px]")} />
                  </div>

                  {formData.quality_variants.map((quality, idx) => (
                    <div key={`${quality.name}-${idx}`} className="rounded-[12px] border border-[#E5E9EF] bg-white p-[10px]">
                      <div className="flex items-start gap-[8px]">
                        <div className="min-w-0 flex-1 space-y-[8px]">
                          <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2">
                            <Input value={quality.name} onChange={(e) => { const values = [...formData.quality_variants]; values[idx] = { ...values[idx], name: e.target.value }; setFormData({ ...formData, quality_variants: values }); }} placeholder="اسم الجودة" className={inputClass} />
                            <Input type="number" value={quality.price} onChange={(e) => { const values = [...formData.quality_variants]; values[idx] = { ...values[idx], price: parseFloat(e.target.value) || 0 }; setFormData({ ...formData, quality_variants: values }); }} placeholder="السعر" className={inputClass} />
                          </div>

                          <Textarea rows={2} value={quality.description} onChange={(e) => { const values = [...formData.quality_variants]; values[idx] = { ...values[idx], description: e.target.value }; setFormData({ ...formData, quality_variants: values }); }} placeholder="الوصف الخاص بهذه الجودة" className={textareaClass} />
                        </div>

                        <button type="button" onClick={() => setFormData((prev) => ({ ...prev, quality_variants: prev.quality_variants.filter((_, i) => i !== idx) }))} className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C76161] hover:bg-[#FFF3F1]"><Trash2 className="h-[11px] w-[11px]" /></button>
                      </div>

                      <div className="mt-[9px] border-t border-[#EEF1F4] pt-[9px]">
                        <div className="flex flex-wrap items-center justify-between gap-[8px]">
                          <div className="flex items-center gap-[8px]">
                            <p className="text-[8px] font-semibold text-[#616974]">صور الجودة</p>
                            <label className="flex h-[29px] cursor-pointer items-center gap-[5px] rounded-[8px] border border-[#E1E5EA] bg-[#FAFBFC] px-[8px] text-[7px] font-semibold text-[#767E89] transition-colors hover:bg-white hover:text-[#675CBA]">
                              {uploadingQualityIdx === idx ? <Loader2 className="h-[9px] w-[9px] animate-spin" /> : <Upload className="h-[9px] w-[9px]" />}
                              {uploadingQualityIdx === idx ? 'جاري الرفع...' : 'رفع صور'}
                              <input type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;
                                setUploadingQualityIdx(idx);
                                const urls: string[] = [];
                                for (const file of files) {
                                  try {
                                    const prepared = await prepareImage(file);
                                    const path = `products/quality-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
                                    const { error } = await supabase.storage.from('uploads').upload(path, prepared, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
                                    if (!error) {
                                      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
                                      urls.push(data.publicUrl);
                                    }
                                  } catch (err: any) {
                                    toast({ title: `فشل رفع ${file.name}`, description: err?.message, variant: 'destructive' });
                                  }
                                }
                                const values = [...formData.quality_variants];
                                values[idx] = { ...values[idx], images: [...(values[idx].images || []), ...urls] };
                                setFormData({ ...formData, quality_variants: values });
                                setUploadingQualityIdx(null);
                                e.target.value = '';
                              }} />
                            </label>
                          </div>

                          <label className="flex cursor-pointer items-center gap-[6px] text-[7.5px] font-medium text-[#747C87]">
                            <Checkbox checked={quality.in_stock} onCheckedChange={(checked) => { const values = [...formData.quality_variants]; values[idx] = { ...values[idx], in_stock: !!checked }; setFormData({ ...formData, quality_variants: values }); }} className="h-[14px] w-[14px] border-[#BBC1C9] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                            متوفر
                          </label>
                        </div>

                        {quality.images?.length > 0 && (
                          <div className="mt-[9px] flex flex-wrap gap-[6px]">
                            {quality.images.map((image, imageIndex) => (
                              <div key={`${image}-${imageIndex}`} className="group relative h-[62px] w-[50px] overflow-hidden rounded-[8px] border border-[#E5E8ED] bg-[#F4F5F7]">
                                <img loading="lazy" src={image} alt="" className="h-full w-full object-cover" />
                                <button type="button" onClick={() => { const values = [...formData.quality_variants]; values[idx] = { ...values[idx], images: values[idx].images.filter((_, i) => i !== imageIndex) }; setFormData({ ...formData, quality_variants: values }); }} className="absolute left-[3px] top-[3px] flex h-[17px] w-[17px] items-center justify-center rounded-[5px] bg-white/95 text-[#C76161] opacity-0 transition-opacity group-hover:opacity-100"><X className="h-[8px] w-[8px]" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          </div>

          {/* ===================================================
              SIDE COLUMN
          =================================================== */}

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
            <FormSection icon={Settings2} tone="slate" title="حالة المنتج" description="تحكم في نشر المنتج وظهوره.">
              <div className="space-y-[7px]">
                <ToggleRow checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} icon={Eye} tone="indigo" title="نشط" description="إظهار المنتج داخل المتجر." />
                <ToggleRow checked={formData.in_stock} onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })} icon={PackageCheck} tone="green" title="متوفر للبيع" description="يسمح للعميل بطلب المنتج." />
                <ToggleRow checked={formData.is_featured} onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })} icon={Sparkles} tone="violet" title="منتج مميز" description="استخدامه في المواضع المميزة." />
                <ToggleRow checked={formData.is_best_seller} onCheckedChange={(checked) => setFormData({ ...formData, is_best_seller: checked })} icon={Store} tone="amber" title="الأكثر مبيعًا" description="تمييز المنتج ضمن الأفضل مبيعًا." />
              </div>

              <div className="mt-[10px] grid grid-cols-2 gap-[7px] border-t border-[#EEF1F4] pt-[10px]">
                <MiniValue label="المخزون" value={visibleStock.toLocaleString('en-US')} tone={visibleStock > 0 ? 'green' : 'coral'} />
                <MiniValue label="الألوان" value={formData.color_variants.length.toLocaleString('en-US')} tone="indigo" />
              </div>
            </FormSection>

            <FormSection icon={LayoutGrid} tone="rose" title="مواضع الظهور" description="حدد الصفحات والأقسام التي سيظهر فيها المنتج.">
              <div>
                <p className="mb-[7px] text-[8px] font-semibold text-[#747C86]">صفحات المجموعات</p>

                <div className="space-y-[6px]">
                  {[
                    { key: 'curated', label: 'منتجات مختارة بعناية' },
                    { key: 'new_season', label: 'جديد الموسم' },
                    { key: 'best_sellers', label: 'الأكثر مبيعًا' },
                  ].map((collection) => {
                    const active = formData.home_collections.includes(collection.key);
                    return <ChoiceRow key={collection.key} active={active} label={collection.label} onClick={() => toggleHomeCollection(collection.key)} />;
                  })}
                </div>
              </div>

              {sections.length > 0 && (
                <div className="mt-[11px] border-t border-[#EEF1F4] pt-[10px]">
                  <div className="mb-[7px] flex items-center justify-between">
                    <p className="text-[8px] font-semibold text-[#747C86]">أقسام الصفحة الرئيسية</p>
                    <span className="rounded-[6px] bg-[#F1EFFF] px-[6px] py-[3px] text-[6.5px] font-semibold text-[#675CBA]">{formData.section_ids.length}</span>
                  </div>

                  <div className="max-h-[240px] space-y-[5px] overflow-y-auto pl-[2px] [scrollbar-width:thin]">
                    {sections.map((section) => (
                      <ChoiceRow key={section.id} active={formData.section_ids.includes(section.id)} label={section.title_ar} muted={!section.is_active ? 'غير نشط' : undefined} onClick={() => toggleSection(section.id)} />
                    ))}
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection icon={RotateCcw} tone="cyan" title="سياسة الإرجاع" description="سياسة خاصة بهذا المنتج إن وجدت.">
              <Textarea value={formData.return_policy} onChange={(e) => setFormData({ ...formData, return_policy: e.target.value })} rows={4} placeholder="مثال: قابل للإرجاع خلال 7 أيام بشرط بقاء المنتج بحالته الأصلية..." className={textareaClass} />
            </FormSection>

            <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[12px]">
              <div className="flex items-center gap-[8px]">
                <div className={cn("flex h-[31px] w-[31px] items-center justify-center rounded-[9px]", requiredFieldsReady ? "bg-[#EAF7EE] text-[#57906A]" : "bg-[#FFF5E5] text-[#B98031]")}>
                  {requiredFieldsReady ? <Check className="h-[13px] w-[13px]" strokeWidth={2} /> : <ClipboardList className="h-[13px] w-[13px]" strokeWidth={1.7} />}
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-[#4C545E]">{requiredFieldsReady ? 'البيانات الأساسية جاهزة' : 'راجع الحقول المطلوبة'}</p>
                  <p className="mt-[2px] text-[6.5px] text-[#9CA3AC]">{requiredFieldsReady ? 'يمكن حفظ المنتج الآن.' : 'الاسم العربي والسعر والقسم مطلوبة.'}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* =====================================================
            STICKY SAVE BAR
        ===================================================== */}

        <div className="sticky bottom-[10px] z-20 rounded-[14px] border border-[#DFE3E9] bg-white/95 p-[8px] shadow-[0_12px_35px_rgba(30,38,52,0.10)] backdrop-blur-md">
          <div className="flex flex-col gap-[8px] sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden items-center gap-[8px] sm:flex">
              <div className={cn("h-[7px] w-[7px] rounded-full", requiredFieldsReady ? "bg-[#629067]" : "bg-[#C38838]")} />
              <div>
                <p className="text-[8px] font-semibold text-[#58606A]">{isEditing ? 'تعديل المنتج الحالي' : 'إنشاء منتج جديد'}</p>
                <p className="mt-[2px] text-[6.5px] text-[#9CA3AC]">{formData.name_ar.trim() || formData.name.trim() || 'لم يتم إدخال اسم المنتج بعد'}</p>
              </div>
            </div>

            <div className="flex items-center gap-[6px] sm:mr-auto">
              <button type="button" onClick={() => navigate('/admin/products')} className="flex h-[38px] flex-1 items-center justify-center rounded-[9px] border border-[#E2E6EB] bg-white px-[13px] text-[8.5px] font-semibold text-[#707884] transition-colors hover:bg-[#F8FAFC] sm:flex-none">إلغاء</button>
              <Button type="submit" disabled={isSaving} className="h-[38px] flex-1 gap-[6px] rounded-[9px] bg-[#675CBA] px-[15px] text-[8.5px] font-semibold text-white shadow-none hover:bg-[#594FAB] sm:flex-none">
                {isSaving ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : <Save className="h-[11px] w-[11px]" strokeWidth={1.8} />}
                {isSaving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

/* =========================================================
   SHARED UI
========================================================= */

const inputClass = "h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] px-[11px] text-[10.5px] font-medium text-[#414852] shadow-none placeholder:text-[#A2A9B2] focus-visible:border-[#D5D9E4] focus-visible:bg-white focus-visible:ring-0";
const textareaClass = "resize-none rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] px-[11px] py-[9px] text-[10.5px] font-medium leading-6 text-[#414852] shadow-none placeholder:text-[#A2A9B2] focus-visible:border-[#D5D9E4] focus-visible:bg-white focus-visible:ring-0";
const selectClass = "h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] px-[10px] text-[10px] font-medium text-[#4E5661] shadow-none focus:ring-0";

type SectionTone = 'indigo' | 'green' | 'blue' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate';

const sectionTone: Record<SectionTone, string> = {
  indigo: 'bg-[#F1EFFF] text-[#675CBA]',
  green: 'bg-[#EAF7EE] text-[#57906A]',
  blue: 'bg-[#EDF4FF] text-[#567BC5]',
  amber: 'bg-[#FFF5E5] text-[#B98031]',
  rose: 'bg-[#FFF0F4] text-[#BC6377]',
  violet: 'bg-[#F4ECFF] text-[#8A5FBC]',
  cyan: 'bg-[#EAF7FB] text-[#45899F]',
  slate: 'bg-[#F0F2F4] text-[#707985]',
};

const FormSection = ({ icon: Icon, tone, title, description, children }: { icon: LucideIcon; tone: SectionTone; title: string; description?: string; children: ReactNode }) => {
  return (
    <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
      <div className="mb-[13px] flex items-start gap-[9px] border-b border-[#EEF1F4] pb-[11px]">
        <div className={cn("flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-[9px]", sectionTone[tone])}><Icon className="h-[13px] w-[13px]" strokeWidth={1.7} /></div>
        <div className="min-w-0">
          <h2 className="text-[11.5px] font-semibold text-[#3E4650]">{title}</h2>
          {description && <p className="mt-[3px] text-[7.5px] leading-4 text-[#9AA1AB]">{description}</p>}
        </div>
      </div>
      <div className="space-y-[11px]">{children}</div>
    </section>
  );
};

const Field = ({ label, helper, required, children }: { label: string; helper?: string; required?: boolean; children: ReactNode }) => {
  return (
    <div>
      <label className="mb-[6px] flex items-center gap-[4px] text-[8.5px] font-semibold text-[#737B86]">{label}{required && <span className="text-[#C76161]">*</span>}</label>
      {children}
      {helper && <p className="mt-[5px] text-[6.8px] leading-4 text-[#9FA6AF]">{helper}</p>}
    </div>
  );
};

const MiniValue = ({ label, value, helper, tone }: { label: string; value: string; helper?: string; tone: 'indigo' | 'green' | 'coral' | 'slate' }) => {
  const color = tone === 'indigo' ? 'text-[#675CBA]' : tone === 'green' ? 'text-[#57906A]' : tone === 'coral' ? 'text-[#C76161]' : 'text-[#555E69]';

  return (
    <div className="min-w-0">
      <p className="text-[6.5px] font-medium text-[#9AA1AB]">{label}</p>
      <div className="mt-[4px] flex items-end gap-[5px]">
        <p dir="ltr" className={cn("truncate text-right text-[13px] font-semibold leading-none", color)}>{value}</p>
        {helper && <span className="text-[6.5px] font-semibold text-[#8D949E]">{helper}</span>}
      </div>
    </div>
  );
};

const ToggleRow = ({ checked, onCheckedChange, icon: Icon, tone, title, description }: { checked: boolean; onCheckedChange: (checked: boolean) => void; icon: LucideIcon; tone: SectionTone; title: string; description: string }) => {
  return (
    <label className={cn("flex cursor-pointer items-center gap-[9px] rounded-[11px] border p-[8px] transition-colors", checked ? "border-[#DDD8F0] bg-[#FAF9FF]" : "border-[#E8EBEF] bg-[#FAFBFC] hover:bg-white")}>
      <div className={cn("flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px]", sectionTone[tone])}><Icon className="h-[12px] w-[12px]" strokeWidth={1.7} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[8.5px] font-semibold text-[#555D67]">{title}</p>
        <p className="mt-[2px] text-[6.5px] leading-4 text-[#9AA1AB]">{description}</p>
      </div>
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(!!value)} className="h-[15px] w-[15px] shrink-0 border-[#B9C0C8] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
    </label>
  );
};

const ChoiceRow = ({ active, label, muted, onClick }: { active: boolean; label: string; muted?: string; onClick: () => void }) => {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("flex min-h-[34px] w-full items-center gap-[7px] rounded-[9px] border px-[8px] text-right transition-colors", active ? "border-[#DDD8F0] bg-[#F7F5FF]" : "border-[#E8EBEF] bg-[#FAFBFC] hover:bg-white")}>
      <span className={cn("flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[5px] border", active ? "border-[#675CBA] bg-[#675CBA] text-white" : "border-[#C8CDD4] bg-white text-transparent")}><Check className="h-[8px] w-[8px]" strokeWidth={2.2} /></span>
      <span className={cn("min-w-0 flex-1 truncate text-[7.8px] font-semibold", active ? "text-[#5F57A0]" : "text-[#717984]")}>{label}</span>
      {muted && <span className="rounded-[5px] bg-[#F0F2F4] px-[5px] py-[2px] text-[5.8px] font-medium text-[#9CA3AC]">{muted}</span>}
      <ChevronLeft className="h-[9px] w-[9px] shrink-0 text-[#B0B6BE]" strokeWidth={1.8} />
    </button>
  );
};

export default AdminProductFormPage;