import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json, TablesInsert } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowRight, BadgeDollarSign, Boxes, ClipboardList, Eye, Layers3, Loader2, Package, Plus, Save, Settings2, Shield, Sparkles, Trash2, Truck, Upload, X, LayoutGrid, RotateCcw, GripVertical, ZoomIn, Move } from 'lucide-react';
import type { ColorVariant } from '@/components/admin/ColorVariantsEditor';
import { syncProductInventory } from '@/lib/productInventory';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { fetchAdminProductCostMap } from '@/lib/admin/productCosts';

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

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const details = error as { details?: unknown; hint?: unknown; message?: unknown };
    return String(details.message || details.details || details.hint || fallback);
  }
  return fallback;
};

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
  const [standaloneSizes, setStandaloneSizes] = useState<Array<{ size: string; stock: number }>>([]);
  const [newStandaloneSize, setNewStandaloneSize] = useState('');

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
      const { data, error } = await supabase
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
    return brands.filter((brand) => mappedBrandIds.has(brand.id));
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

  const previewStockQty = useMemo(() => {
    if (formData.color_variants.length > 0) {
      return formData.color_variants.reduce((total, color) => {
        const sizes = color.sizes || [];
        return total + (sizes.length > 0
          ? sizes.reduce((colorTotal, entry) => colorTotal + (typeof entry === 'string' ? 0 : entry.stock || 0), 0)
          : color.stock || 0);
      }, 0);
    }
    if (standaloneSizes.length > 0) return standaloneSizes.reduce((total, item) => total + Math.max(0, Number(item.stock || 0)), 0);
    return Math.max(0, parseInt(formData.stock_quantity || '0') || 0);
  }, [formData.color_variants, formData.stock_quantity, standaloneSizes]);

  const previewPrice = parseLocalizedNumber(formData.price);
  const previewCost = parseLocalizedNumber(formData.cost_price);
  const previewProfit = Number.isFinite(previewPrice) && Number.isFinite(previewCost) ? previewPrice - previewCost : 0;

  const fetchProduct = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,name_ar,slug,price,original_price,discount,description,description_ar,category,category_id,brand,brand_id,in_stock,is_featured,is_best_seller,is_active,countries,section_ids,home_collections,accessories,features,color_variants,stock_quantity,return_policy,specs,has_quality_variants,quality_variants')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المنتج', variant: 'destructive' });
      navigate('/admin/products');
    } else {
      let protectedCost: number | null;

      try {
        const costs = await fetchAdminProductCostMap([data.id]);
        protectedCost = costs.get(data.id) ?? null;
      } catch (costError) {
        console.error('Failed to load protected product cost', costError);
        toast({ title: 'خطأ', description: 'تعذر تحميل تكلفة المنتج المحمية؛ لن يتم فتح التعديل حتى لا تُستبدل التكلفة.', variant: 'destructive' });
        navigate('/admin/products');
        setIsLoading(false);
        return;
      }

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
        cost_price: protectedCost?.toString() || '',
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
        section_ids: data.section_ids || [],
        home_collections: data.home_collections || [],
        accessories: asArray<Accessory>(data.accessories),
        features: asArray<ProductFeature>(data.features),
        color_variants: asArray<ColorVariant>(data.color_variants),
        stock_quantity: data.stock_quantity?.toString() || '0',
        return_policy: data.return_policy || '',
        specs: asArray<{ label: string; value: string }>(data.specs),
        has_quality_variants: data.has_quality_variants ?? false,
        quality_variants: asArray<{ name: string; price: number; description: string; images: string[]; in_stock: boolean }>(data.quality_variants),
      });

      const { data: skuRows, error: skuError } = await supabase
        .from('inventory_skus')
        .select('size,stock_quantity,color_name,is_default')
        .eq('product_id', data.id)
        .eq('is_default', false);

      if (!skuError) {
        const standalone = (skuRows || [])
          .filter((row) => !row.color_name && row.size)
          .map((row) => ({ size: String(row.size), stock: Math.max(0, Number(row.stock_quantity || 0)) }));
        setStandaloneSizes(standalone);
      }
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

  const handleSubmit = async (e: FormEvent) => {
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
      : standaloneSizes.length > 0
        ? standaloneSizes.reduce((total, item) => total + Math.max(0, Number(item.stock || 0)), 0)
        : Math.max(0, parseInt(formData.stock_quantity || '0') || 0);
    const selectedCat = categories.find((c) => c.id === selectedCategoryId)
      || categories.find((c) => c.slug === resolvedCategory)
      || null;
    const brandName = formData.brand.trim();
    const selectedBrand = brands.find((brand) => brand.name?.trim() === brandName) || null;
    const productData: TablesInsert<'products'> = {
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
      has_sizes: standaloneSizes.length > 0 || formData.color_variants.some((color) => (color.sizes || []).length > 0),
      sizes: standaloneSizes.map((item) => item.size),
      accessories: formData.accessories as unknown as Json,
      features: formData.features as unknown as Json,
      color_variants: formData.color_variants as unknown as Json,
      return_policy: formData.return_policy || null,
      specs: formData.specs as unknown as Json,
      has_quality_variants: formData.has_quality_variants,
      quality_variants: formData.quality_variants as unknown as Json,
    };

    try {
      let savedProductId = id || '';

      if (isEditing) {
        const { data: savedProduct, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
          .select('id,category,category_id')
          .single();
        if (error) throw error;
        if (savedProduct.category_id !== selectedCat?.id) {
          throw new Error('لم يتم حفظ القسم الفرعي المحدد. أعد اختيار القسم ثم احفظ مرة أخرى.');
        }
        savedProductId = savedProduct.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();
        if (error) throw error;
        if (!inserted?.id) throw new Error('لم يتم إنشاء المنتج (استجابة فارغة)');
        savedProductId = inserted.id;
      }

      // inventory_skus هو مصدر الحقيقة للمخزون. هذا الربط يجعل صفحة إضافة/تعديل
      // المنتج ومركز المخزون وصفحة العميل كلها تقرأ نفس الكميات.
      await syncProductInventory(
        savedProductId,
        formData.color_variants,
        Math.max(0, parseInt(formData.stock_quantity || '0') || 0),
        standaloneSizes,
      );

      toast({
        title: 'تم الحفظ',
        description: isEditing ? 'تم تحديث المنتج ومخزونه الحقيقي بنجاح' : 'تم إضافة المنتج وربط مخزونه بنجاح',
      });
      navigate('/admin/products');
    } catch (error: unknown) {
      const desc = errorMessage(error, 'فشل حفظ المنتج');
      console.error('[product-save] error:', error);
      toast({ title: 'خطأ في حفظ المنتج', description: desc, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8" dir="rtl">
      <AdminPageHeader category="الكتالوج والمخزون" title={isEditing ? "تعديل المنتج" : "إضافة منتج جديد"} description="إدارة معلومات المنتج، التسعير، الصور، المخزون والتفاصيل من مكان واحد" actions={[{ label: isSaving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "حفظ المنتج", icon: Save, onClick: () => (document.getElementById('product-editor-form') as HTMLFormElement | null)?.requestSubmit(), variant: "primary" }, { label: "العودة للمنتجات", icon: ArrowRight, onClick: () => navigate('/admin/products'), variant: "outline" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <ProductEditorStat title="سعر البيع" value={Number.isFinite(previewPrice) ? previewPrice.toFixed(2) : "0.00"} helper="السعر الظاهر للعميل" icon={BadgeDollarSign} tone="indigo" />
        <ProductEditorStat title="الربح المتوقع" value={Number.isFinite(previewProfit) ? previewProfit.toFixed(2) : "0.00"} helper="قبل المصاريف الإضافية" icon={Sparkles} tone="green" />
        <ProductEditorStat title="إجمالي المخزون" value={previewStockQty.toLocaleString('en-US')} helper={formData.color_variants.length > 0 ? "من الألوان والمقاسات" : standaloneSizes.length > 0 ? "من المقاسات" : "مخزون عام"} icon={Boxes} tone="blue" />
        <ProductEditorStat title="حالة المنتج" value={formData.is_active ? "نشط" : "معطل"} helper={formData.in_stock && previewStockQty > 0 ? "متاح للبيع" : "غير متاح للبيع حاليًا"} icon={Eye} tone={formData.is_active ? "green" : "coral"} />
      </section>

      <form id="product-editor-form" onSubmit={handleSubmit} className="space-y-[12px]">
        {/* Basic Info */}
        <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] space-y-[12px] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#675CBA]">
          <h2 className="flex items-center gap-[7px] border-b border-[#EEF1F4] pb-[10px] text-[12px] font-semibold text-[#3F4650]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><Package className="h-[12px] w-[12px]" /></span>المعلومات الأساسية</h2>
          
          <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">الاسم (إنجليزي)</label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Product Name"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">الاسم (عربي) *</label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="اسم المنتج"
                dir="rtl"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">الرابط (Slug)</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="product-name"
              dir="ltr"
              className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
            />
          </div>

          <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">سعر البيع *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
              <p className="text-[8px] text-[#969DA7] mt-[4px]">السعر الذي يظهر للعميل</p>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">سعر التكلفة *</label>
              <Input
                type="number"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
              <p className="text-[8px] text-[#969DA7] mt-[4px]">السعر الأصلي (التكلفة) - الخصومات تُطبق على هذا السعر</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">السعر قبل الخصم (للعرض)</label>
              <Input
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
              <p className="text-[8px] text-[#969DA7] mt-[4px]">يظهر مشطوباً بجانب السعر الحالي</p>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">الخصم %</label>
              <Input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
            </div>
          </div>
          
          {/* Profit Calculator */}
          {formData.price && formData.cost_price && (
            <div className="rounded-[11px] border border-[#E4E8ED] bg-[#F8FAFC] p-[10px]">
              <h3 className="text-[10px] font-semibold text-[#4A525C] mb-[7px]">حاسبة الربح</h3>
              <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3 text-[9px]">
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
                  <span className="text-[8px] text-[#969DA7]">
                    ({(((parseFloat(formData.price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">القسم الرئيسي *</label>
              <Select
                value={selectedParentCategoryId}
                onValueChange={(value) => {
                  const category = parentCategories.find((item) => item.id === value) || null;
                  setSelectedParentCategoryId(value);
                  setSelectedCategoryId(category?.id || null);
                  setFormData((current) => ({
                    ...current,
                    category: value,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم الرئيسي" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_ar} ({cat.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">القسم الفرعي</label>
              <Select
                value={subCategoriesForSelectedParent.some((category) => category.id === selectedCategoryId) ? selectedCategoryId || '' : ''}
                onValueChange={(value) => {
                  const category = subCategoriesForSelectedParent.find((item) => item.id === value) || null;
                  setSelectedCategoryId(category?.id || null);
                  setFormData((current) => ({ ...current, category: category?.slug || '' }));
                }}
                disabled={subCategoriesForSelectedParent.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subCategoriesForSelectedParent.length ? 'اختر القسم الفرعي' : 'لا توجد أقسام فرعية'} />
                </SelectTrigger>
                <SelectContent>
                  {subCategoriesForSelectedParent.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_ar} ({cat.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[8px] text-[#969DA7] mt-[4px]">
                إذا لم توجد أقسام فرعية سيتم حفظ المنتج مباشرة داخل القسم الرئيسي.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">الماركة (اختياري)</label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                placeholder="اكتب اسم الماركة أو اختر من الاقتراحات"
                list="registered-brands"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
              <datalist id="registered-brands">
                {filteredBrands.map((brand) => <option key={brand.id} value={brand.name.trim()} />)}
              </datalist>
              <p className="text-[8px] text-[#969DA7] mt-[4px]">
                يمكنك كتابة ماركة حرة؛ تُربط بصفحة ماركة فقط عند مطابقة اسم ماركة مسجلة.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">الوصف (عربي)</label>
            <Textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              rows={3}
              dir="rtl"
            />
          </div>
        </div>

        {/* Settings */}
        <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] space-y-[12px] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#675CBA]">
          <h2 className="flex items-center gap-[7px] border-b border-[#EEF1F4] pb-[10px] text-[12px] font-semibold text-[#3F4650]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#EDF4FF] text-[#5680CF]"><Settings2 className="h-[12px] w-[12px]" /></span>الإعدادات والظهور</h2>

          <div className="flex flex-wrap gap-[8px]">
            <label className="flex items-center gap-[6px] cursor-pointer rounded-[9px] border border-[#E7EAEF] bg-[#FAFBFC] px-[9px] py-[7px]">
              <Checkbox
                checked={formData.in_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, in_stock: !!checked })}
              />
              <span className="text-[9px] font-medium text-[#5F6771]">متوفر</span>
            </label>
            <label className="flex items-center gap-[6px] cursor-pointer rounded-[9px] border border-[#E7EAEF] bg-[#FAFBFC] px-[9px] py-[7px]">
              <Checkbox
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: !!checked })}
              />
              <span className="text-[9px] font-medium text-[#5F6771]">مميز</span>
            </label>
            <label className="flex items-center gap-[6px] cursor-pointer rounded-[9px] border border-[#E7EAEF] bg-[#FAFBFC] px-[9px] py-[7px]">
              <Checkbox
                checked={formData.is_best_seller}
                onCheckedChange={(checked) => setFormData({ ...formData, is_best_seller: !!checked })}
              />
              <span className="text-[9px] font-medium text-[#5F6771]">الأكثر مبيعاً</span>
            </label>
            <label className="flex items-center gap-[6px] cursor-pointer rounded-[9px] border border-[#E7EAEF] bg-[#FAFBFC] px-[9px] py-[7px]">
              <Checkbox
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
              />
              <span className="text-[9px] font-medium text-[#5F6771]">نشط</span>
            </label>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">النطاق</label>
            <p className="text-[9px] text-[#8D959F]">المنتج سيظهر في المتجر الموحد</p>
          </div>

          {/* Sections */}
          <div>
            <label className="flex items-center gap-[6px] text-[10px] font-medium text-[#6E7680] mb-[8px]">
              <LayoutGrid className="w-4 h-4" />
              صفحات المجموعات
            </label>
            <div className="flex flex-wrap gap-[7px]">
              {[
                { key: "curated", label: "منتجات مختارة بعناية" },
                { key: "best_sellers", label: "الأكثر مبيعاً" },
              ].map((collection) => (
                <button
                  type="button"
                  key={collection.key}
                  aria-pressed={formData.home_collections.includes(collection.key)}
                  onClick={() => toggleHomeCollection(collection.key)}
                  className={`flex items-center gap-[6px] cursor-pointer rounded-[9px] border px-[9px] py-[7px] text-right transition-all ${
                    formData.home_collections.includes(collection.key)
                      ? 'border-[#D8D3EE] bg-[#F3F1FB] text-[#675CBA]'
                      : 'border-[#E4E8ED] bg-white text-[#68717B] hover:border-[#CDC7E8] hover:bg-[#FAF9FF]'
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${formData.home_collections.includes(collection.key) ? 'border-[#675CBA] bg-[#675CBA] text-white' : 'border-[#C9CED6]'}`}>
                    {formData.home_collections.includes(collection.key) && '✓'}
                  </span>
                  <span className="text-[9px]">{collection.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[8px] text-[#969DA7] mt-[5px]">
              اختياري — يحدد ظهور المنتج في صفحات: /curated و /top-selling
            </p>
          </div>

          {sections.length > 0 && (
            <div>
              <label className="flex items-center gap-[6px] text-[10px] font-medium text-[#6E7680] mb-[8px]">
                <LayoutGrid className="w-4 h-4" />
                أقسام الصفحة الرئيسية
              </label>
              <div className="flex flex-wrap gap-[7px]">
                {sections.map((section) => (
                  <label 
                    key={section.id} 
                    className={`flex items-center gap-[6px] cursor-pointer rounded-[9px] border px-[9px] py-[7px] transition-all ${
                      formData.section_ids.includes(section.id)
                        ? 'border-[#D8D3EE] bg-[#F3F1FB] text-[#675CBA]'
                        : 'border-[#E4E8ED] bg-white text-[#68717B] hover:border-[#CDC7E8] hover:bg-[#FAF9FF]'
                    }`}
                  >
                    <Checkbox
                      checked={formData.section_ids.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <span className="text-[9px]">{section.title_ar}</span>
                  </label>
                ))}
              </div>
              <p className="text-[8px] text-[#969DA7] mt-[5px]">
                اختر الأقسام التي تريد عرض هذا المنتج فيها
              </p>
            </div>
          )}
        </div>

        {/* Accessories Section */}
        <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] space-y-[12px] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#675CBA]">
          <h2 className="flex items-center gap-[7px] border-b border-[#EEF1F4] pb-[10px] text-[12px] font-semibold text-[#3F4650]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#FFF0ED] text-[#D06A5E]"><Plus className="h-[12px] w-[12px]" /></span>الملحقات الإضافية</h2>
          <p className="text-[9px] text-[#8D959F]">
            أضف ملحقات اختيارية للمنتج. عند اختيار أي ملحق سيُضاف سعره للسعر الأساسي.
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px]">
              <Input
                value={newAccessory.name}
                onChange={(e) => setNewAccessory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="الاسم (إنجليزي)"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
              <Input
                value={newAccessory.name_ar}
                onChange={(e) => setNewAccessory(prev => ({ ...prev, name_ar: e.target.value }))}
                placeholder="الاسم (عربي) *"
                dir="rtl"
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px]">
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
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
              />
            </div>

            <div className="flex gap-[8px] items-center">
              {newAccessory.image_url ? (
                <div className="relative w-16 h-16 flex-shrink-0">
                  <img loading="lazy" src={newAccessory.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setNewAccessory(prev => ({ ...prev, image_url: '' }))}
                    className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-[58px] flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-[#D7DCE3] bg-[#FAFBFC] transition-colors hover:border-[#BDB6DE] hover:bg-[#F8F7FF]">
                  {uploadingAccessoryImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-[9px] text-[#8D959F] flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      صورة الملحق
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0 hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingAccessoryImage(true);
                      try {
                        const prepared = await prepareImage(file);
                        const path = `accessories/${Date.now()}-${prepared.name}`;
                        const { error } = await supabase.storage
                          .from('uploads')
                          .upload(path, prepared, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
                        if (error) throw error;
                        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
                        setNewAccessory(prev => ({ ...prev, image_url: urlData.publicUrl }));
                      } catch (err: unknown) {
                        toast({ title: 'فشل رفع الصورة', description: errorMessage(err, 'تعذر رفع الصورة.'), variant: 'destructive' });
                      } finally {
                        setUploadingAccessoryImage(false);
                        e.target.value = '';
                      }
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
                  className="flex items-start justify-between rounded-[10px] border border-[#E7EAEF] bg-[#FAFBFC] p-[10px]"
                >
                  <div className="flex items-start gap-[8px]">
                    {acc.image_url && (
                      <img loading="lazy" src={acc.image_url} alt={acc.name_ar} className="w-14 h-14 object-cover rounded-lg" />
                    )}
                    <div className="space-y-1">
                      <div>
                        <span className="text-[9px] font-medium text-[#555D67]">{acc.name_ar}</span>
                        {acc.name && <span className="text-muted-foreground text-sm mr-2">({acc.name})</span>}
                      </div>
                      {acc.description_ar && (
                        <p className="text-[9px] text-[#8D959F]">{acc.description_ar}</p>
                      )}
                      <span className="text-[10px] font-semibold text-[#675CBA]">+{acc.price}</span>
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

        
        {/* Inventory without colors */}
        {formData.color_variants.length === 0 && (
          <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] space-y-[12px] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#675CBA]">
            <div>
              <h2 className="flex items-center gap-[7px] text-[12px] font-semibold text-[#3F4650]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#EAF7EE] text-[#629067]"><Boxes className="h-[12px] w-[12px]" /></span>المقاسات والمخزون</h2>
              <p className="text-[9px] text-[#8D959F] mt-[4px]">يمكنك استخدام مخزون عام، أو إضافة كل مقاس وتحديد كميته. نفس البيانات تظهر للعميل وتُخصم تلقائيًا عند تأكيد الطلب.</p>
            </div>

            {standaloneSizes.length === 0 ? (
              <div className="space-y-2">
                <label className="block text-[9px] text-[#8D959F]">المخزون العام</label>
                <Input type="number" min={0} value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} className="h-12 max-w-xs rounded-2xl bg-muted/30 border-border/60" placeholder="الكمية المتاحة" />
              </div>
            ) : (
              <div className="space-y-2">
                {standaloneSizes.map((item, index) => (
                  <div key={`${item.size}-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px_38px] items-center gap-[6px] rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[7px]">
                    <Input value={item.size} onChange={(e) => setStandaloneSizes((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, size: e.target.value } : row))} placeholder="المقاس" className="h-[38px] rounded-[8px] border-[#E2E6EB] bg-white text-[9px] shadow-none focus-visible:ring-0" />
                    <Input type="number" min={0} value={item.stock} onChange={(e) => setStandaloneSizes((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, stock: Math.max(0, parseInt(e.target.value || '0') || 0) } : row))} placeholder="المخزون" className="h-[38px] rounded-[8px] border-[#E2E6EB] bg-white text-[9px] shadow-none focus-visible:ring-0" />
                    <button type="button" onClick={() => setStandaloneSizes((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]" aria-label="حذف المقاس"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <p className="text-[8px] text-[#969DA7]">الإجمالي: {standaloneSizes.reduce((sum, item) => sum + Number(item.stock || 0), 0)} قطعة</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={newStandaloneSize} onChange={(e) => setNewStandaloneSize(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const size = newStandaloneSize.trim(); if (!size) return; if (standaloneSizes.some((item) => item.size.trim().toLowerCase() === size.toLowerCase())) return toast({ title: 'المقاس موجود بالفعل', variant: 'destructive' }); setStandaloneSizes((current) => [...current, { size, stock: 0 }]); setNewStandaloneSize(''); } }} placeholder="أضف مقاسًا مثل 38 أو XL" className="h-[40px] flex-1 rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:ring-0" />
              <Button type="button" variant="outline" onClick={() => { const size = newStandaloneSize.trim(); if (!size) return toast({ title: 'أدخل المقاس أولًا', variant: 'destructive' }); if (standaloneSizes.some((item) => item.size.trim().toLowerCase() === size.toLowerCase())) return toast({ title: 'المقاس موجود بالفعل', variant: 'destructive' }); setStandaloneSizes((current) => [...current, { size, stock: 0 }]); setNewStandaloneSize(''); }} className="h-[40px] rounded-[9px] gap-[6px] border-[#E0DCEF] bg-white px-[12px] text-[9px] font-semibold text-[#675CBA] hover:bg-[#F7F5FF]"><Plus className="h-4 w-4" />إضافة مقاس</Button>
            </div>

            {standaloneSizes.length > 0 && <button type="button" onClick={() => { setStandaloneSizes([]); setFormData((current) => ({ ...current, stock_quantity: String(standaloneSizes.reduce((sum, item) => sum + Number(item.stock || 0), 0)) })); }} className="text-[8px] text-[#969DA7] underline underline-offset-4">العودة إلى مخزون عام بدون مقاسات</button>}
          </div>
        )}
        <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#5680CF]">
          <div className="mb-[11px] flex items-center justify-between gap-3 border-b border-[#EEF1F4] pb-[10px]">
            <div className="flex items-center gap-[7px]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#EDF4FF] text-[#5680CF]"><Layers3 className="h-[12px] w-[12px]" /></span><div><h2 className="text-[12px] font-semibold text-[#3F4650]">الصور والألوان والمقاسات</h2><p className="mt-[2px] text-[7px] text-[#9AA1AB]">إدارة خيارات المنتج والمخزون لكل لون ومقاس</p></div></div>
            <span className="rounded-[7px] bg-[#F6F7F9] px-[7px] py-[4px] text-[6px] font-semibold text-[#8D959F]">VARIANTS</span>
          </div>
          <Suspense fallback={<div className="h-40 rounded-[12px] border border-[#E5E9EF] bg-[#F4F6F8] animate-pulse" />}>
          <ColorVariantsEditor
            value={formData.color_variants}
            onChange={(v) => setFormData((prev) => ({ ...prev, color_variants: v }))}
          />
          </Suspense>
        </div>

        {/* Specifications */}
        <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] space-y-[12px] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#675CBA]">
          <h2 className="flex items-center gap-[7px] border-b border-[#EEF1F4] pb-[10px] text-[12px] font-semibold text-[#3F4650]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#EDF4FF] text-[#5680CF]"><ClipboardList className="h-[12px] w-[12px]" /></span>المواصفات التفصيلية</h2>
          <p className="text-[8px] text-[#969DA7]">أضف مواصفات المنتج (مثل: المادة، الوزن، البلد، إلخ). تُعرض كجدول قابل للطي في صفحة المنتج.</p>
          <div className="grid grid-cols-1 gap-[7px] md:grid-cols-[1fr_1fr_auto]">
            <Input className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0" placeholder="التسمية (مثل: المادة)" value={newSpec.label} onChange={(e) => setNewSpec({ ...newSpec, label: e.target.value })} />
            <Input className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0" placeholder="القيمة (مثل: جلد طبيعي)" value={newSpec.value} onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })} />
            <Button
              type="button"
              onClick={() => {
                if (!newSpec.label.trim() || !newSpec.value.trim()) return;
                setFormData((p) => ({ ...p, specs: [...p.specs, { label: newSpec.label.trim(), value: newSpec.value.trim() }] }));
                setNewSpec({ label: '', value: '' });
              }}
              className="h-[40px] rounded-[9px] bg-[#675CBA] px-[14px] text-[9px] font-semibold text-white shadow-none hover:bg-[#594FAB]"
            >
              إضافة
            </Button>
          </div>
          {formData.specs.length > 0 && (
            <div className="space-y-2">
              {formData.specs.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-[9px] border border-[#E7EAEF] bg-[#FAFBFC]">
                  <span className="text-sm font-medium flex-1">{s.label}</span>
                  <span className="text-[9px] text-[#8D959F] flex-1">{s.value}</span>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, specs: p.specs.filter((_, idx) => idx !== i) }))}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quality Variants */}
        <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] space-y-[12px] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#675CBA]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-[7px] text-[12px] font-semibold text-[#3F4650]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#FFF5E5] text-[#C38838]"><Shield className="h-[12px] w-[12px]" /></span>جودات / خامات متعددة</h2>
              <p className="text-[8px] text-[#969DA7] mt-[4px]">فعّل هذا الخيار إذا كان لدى المنتج أكثر من جودة أو خامة بأسعار وصور مختلفة.</p>
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.has_quality_variants}
                onChange={(e) => setFormData({ ...formData, has_quality_variants: e.target.checked })}
                className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0 w-4"
              />
              <span className="text-[9px]">مفعّل</span>
            </label>
          </div>

          {formData.has_quality_variants && (
            <>
              <div className="grid grid-cols-1 gap-[7px] md:grid-cols-[1fr_120px_auto]">
                <Input
                  placeholder="اسم الجودة (مثل: ممتاز / A+)"
                  value={newQuality.name}
                  onChange={(e) => setNewQuality({ ...newQuality, name: e.target.value })}
                  className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
                />
                <Input
                  type="number"
                  placeholder="السعر"
                  value={newQuality.price}
                  onChange={(e) => setNewQuality({ ...newQuality, price: e.target.value })}
                  className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newQuality.name.trim() || !newQuality.price) return;
                    setFormData((p) => ({
                      ...p,
                      quality_variants: [...p.quality_variants, {
                        name: newQuality.name.trim(),
                        price: parseFloat(newQuality.price),
                        description: newQuality.description.trim(),
                        images: [],
                        in_stock: true,
                      }],
                    }));
                    setNewQuality({ name: '', price: '', description: '' });
                  }}
                  className="h-[40px] rounded-[9px] bg-[#675CBA] px-[14px] text-[9px] font-semibold text-white shadow-none hover:bg-[#594FAB]"
                >
                  إضافة جودة
                </Button>
              </div>
              <Textarea
                rows={2}
                placeholder="وصف الجودة الجديدة (اختياري)"
                value={newQuality.description}
                onChange={(e) => setNewQuality({ ...newQuality, description: e.target.value })}
              />

              {formData.quality_variants.length > 0 && (
                <div className="space-y-[10px]">
                  {formData.quality_variants.map((qv, idx) => (
                    <div key={idx} className="rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[10px] space-y-[8px]">
                      <div className="flex items-start justify-between gap-[8px]">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input
                              value={qv.name}
                              onChange={(e) => {
                                const v = [...formData.quality_variants];
                                v[idx] = { ...v[idx], name: e.target.value };
                                setFormData({ ...formData, quality_variants: v });
                              }}
                              placeholder="الاسم"
                              className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
                            />
                            <Input
                              type="number"
                              value={qv.price}
                              onChange={(e) => {
                                const v = [...formData.quality_variants];
                                v[idx] = { ...v[idx], price: parseFloat(e.target.value) || 0 };
                                setFormData({ ...formData, quality_variants: v });
                              }}
                              placeholder="السعر"
                              className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0"
                            />
                          </div>
                          <Textarea
                            rows={2}
                            value={qv.description}
                            onChange={(e) => {
                              const v = [...formData.quality_variants];
                              v[idx] = { ...v[idx], description: e.target.value };
                              setFormData({ ...formData, quality_variants: v });
                            }}
                            placeholder="الوصف الخاص بهذه الجودة"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({
                            ...p,
                            quality_variants: p.quality_variants.filter((_, i) => i !== idx),
                          }))}
                          className="text-destructive hover:text-destructive/80 shrink-0 mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Images */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">صور هذه الجودة</span>
                          <label className="inline-flex items-center gap-2 text-xs cursor-pointer rounded-[8px] border border-[#E3E7EC] bg-white px-[8px] py-[6px] text-[8px] hover:bg-[#F7F8FA]">
                            {uploadingQualityIdx === idx ? 'جاري الرفع...' : 'رفع صور'}
                            <input
                              type="file"
                              accept="image/*,.heic,.heif"
                              multiple
                              className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:border-[#D4D9E0] focus-visible:bg-white focus-visible:ring-0 hidden"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []) as File[];
                                if (files.length === 0) return;
                                setUploadingQualityIdx(idx);
                                const urls: string[] = [];
                                for (const f of files) {
                                  try {
                                    const prepared = await prepareImage(f);
                                    const path = `products/quality-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
                                    const { error } = await supabase.storage.from('uploads').upload(path, prepared, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
                                    if (!error) {
                                      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
                                      urls.push(data.publicUrl);
                                    }
                                  } catch (err: unknown) {
                                    toast({ title: `فشل رفع ${f.name}`, description: errorMessage(err, 'تعذر رفع الصورة.'), variant: 'destructive' });
                                  }
                                }
                                const v = [...formData.quality_variants];
                                v[idx] = { ...v[idx], images: [...(v[idx].images || []), ...urls] };
                                setFormData({ ...formData, quality_variants: v });
                                setUploadingQualityIdx(null);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {qv.images && qv.images.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {qv.images.map((img, i) => (
                              <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-border">
                                <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const v = [...formData.quality_variants];
                                    v[idx] = { ...v[idx], images: v[idx].images.filter((_, j) => j !== i) };
                                    setFormData({ ...formData, quality_variants: v });
                                  }}
                                  className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                >×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-[8px] rounded-[14px] border border-[#E3E7EC] bg-white/95 px-[12px] py-[10px] shadow-[0_-6px_20px_rgba(32,36,45,0.05)] backdrop-blur">
          <div>
            <p className="text-[9px] font-semibold text-[#4F5761]">{isEditing ? 'تعديل المنتج' : 'منتج جديد'}</p>
            <p className="mt-[2px] text-[7px] text-[#9AA1AB]">المخزون المتوقع: {previewStockQty} قطعة • {formData.is_active ? 'نشط' : 'معطل'}</p>
          </div>
          <div className="flex items-center gap-[7px]">
            <Button type="button" variant="outline" className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-[15px] text-[9px] font-semibold text-[#6F7781] shadow-none" onClick={() => navigate('/admin/products')}>إلغاء</Button>
            <Button type="submit" disabled={isSaving} className="h-[38px] rounded-[9px] bg-[#675CBA] px-[18px] text-[9px] font-semibold text-white shadow-none transition-colors hover:bg-[#594FAB] disabled:opacity-50">
              {isSaving ? <><Loader2 className="ml-[6px] h-[12px] w-[12px] animate-spin" />جاري الحفظ...</> : <><Save className="ml-[6px] h-[12px] w-[12px]" />{isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}</>}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};


const ProductEditorStat = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: typeof Package; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={`absolute inset-x-0 top-0 h-[3px] ${style.line}`} />
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-[32px] w-[32px] items-center justify-center rounded-[10px] ${style.icon}`}><Icon className="h-[14px] w-[14px]" strokeWidth={1.7} /></div>
        <span className="text-[6px] font-semibold tracking-[0.08em] text-[#A2A8B0]">PRODUCT</span>
      </div>
      <p className="mt-[10px] text-[8px] font-medium text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[19px] font-semibold leading-none tracking-[-0.03em] text-[#303741]">{value}</p>
      <p className="mt-[6px] truncate text-[6.5px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

export default AdminProductFormPage;
