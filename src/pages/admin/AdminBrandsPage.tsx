import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Plus, Pencil, Trash2, Upload, Tag, Search, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface Category {
  id: string;
  name_ar: string;
  parent_id: string | null;
}

interface BrandCategoryRow {
  brand_id: string;
  category_id: string;
}

const AdminBrandsPage = () => {
  const SINGLE_COUNTRY = 'GLOBAL';
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    countries: [SINGLE_COUNTRY] as string[],
    is_active: true,
    sort_order: 0,
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: brands, isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Brand[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories-for-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name_ar,parent_id')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  const { data: brandCategoryRows = [] } = useQuery({
    queryKey: ['admin-brand-categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brand_categories')
        .select('brand_id,category_id');
      if (error) throw error;
      return (data || []) as BrandCategoryRow[];
    },
  });

  const brandToCategoryIds = brandCategoryRows.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.brand_id]) acc[row.brand_id] = [];
    acc[row.brand_id].push(row.category_id);
    return acc;
  }, {});

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string; category_ids: string[] }) => {
      console.log('Saving brand:', data);

      let brandId = data.id;

      if (data.id) {
        const { data: result, error } = await supabase
          .from('brands')
          .update({
            name: data.name,
            logo_url: data.logo_url || null,
            countries: data.countries,
            is_active: data.is_active,
            sort_order: data.sort_order,
          })
          .eq('id', data.id)
          .select();

        console.log('Update result:', result, 'Error:', error);
        if (error) throw error;
        brandId = result?.[0]?.id || data.id;
      } else {
        const { data: result, error } = await supabase
          .from('brands')
          .insert({
            name: data.name,
            logo_url: data.logo_url || null,
            countries: data.countries,
            is_active: data.is_active,
            sort_order: data.sort_order,
          })
          .select();

        console.log('Insert result:', result, 'Error:', error);
        if (error) throw error;
        brandId = result?.[0]?.id;
      }

      if (!brandId) throw new Error('تعذر تحديد الماركة لحفظ ربط الأقسام');

      const { error: clearError } = await (supabase as any)
        .from('brand_categories')
        .delete()
        .eq('brand_id', brandId);
      if (clearError) throw clearError;

      if (data.category_ids.length > 0) {
        const payload = data.category_ids.map((categoryId) => ({
          brand_id: brandId,
          category_id: categoryId,
        }));
        const { error: linkError } = await (supabase as any)
          .from('brand_categories')
          .insert(payload);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-categories'] });
      toast({ title: editingBrand ? 'تم تحديث الماركة' : 'تم إضافة الماركة' });
      resetForm();
    },
    onError: (error: any) => {
      console.error('Brand save error:', error);
      toast({ title: 'حدث خطأ', description: error?.message || 'فشل في حفظ الماركة', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      toast({ title: 'تم حذف الماركة' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('brands')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `brands/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

    if (uploadError) {
      toast({ title: 'خطأ في رفع الصورة', variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    setFormData({ ...formData, logo_url: urlData.publicUrl });
    setUploading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      logo_url: '',
      countries: [SINGLE_COUNTRY],
      is_active: true,
      sort_order: 0,
    });
    setSelectedCategoryIds([]);
    setEditingBrand(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      logo_url: brand.logo_url || '',
      countries: brand.countries || [SINGLE_COUNTRY],
      is_active: brand.is_active ?? true,
      sort_order: brand.sort_order ?? 0,
    });
    setSelectedCategoryIds(brandToCategoryIds[brand.id] || []);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingBrand?.id,
      category_ids: selectedCategoryIds,
    });
  };

  const filteredBrands = brands?.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    total: brands?.length || 0,
    active: brands?.filter(b => b.is_active).length || 0,
    inactive: brands?.filter(b => !b.is_active).length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-[1600px] mx-auto px-5 md:px-8 py-10 space-y-10" dir="rtl">
      {/* Header */}
      <AdminPageHeader
        category="الكتالوج"
        title="الماركات"
        description={`${stats.total} ماركة • ${stats.active} نشطة`}
        actions={[
          {
            label: "إضافة ماركة",
            icon: Plus,
            onClick: () => { resetForm(); setIsDialogOpen(true); },
            variant: "primary",
          },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'الكل', value: stats.total, color: 'from-primary/20 to-primary/10 border-primary/20' },
          { label: 'نشطة', value: stats.active, color: 'from-green-500/20 to-green-500/10 border-green-500/20' },
          { label: 'معطلة', value: stats.inactive, color: 'from-red-500/20 to-red-500/10 border-red-500/20' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "relative overflow-hidden p-6 rounded-3xl border bg-gradient-to-br shadow-sm hover:shadow-md transition-all duration-300",
              stat.color
            )}
          >
            <p className="text-2xl font-heading">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن ماركة..."
          className="h-16 pr-14 bg-transparent border-0 focus-visible:ring-0 text-base"
          dir="rtl"
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden grid gap-5">
        {filteredBrands.map((brand,index)=>(
          <motion.div key={brand.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:index*0.05}} className="group relative bg-card border border-border rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <div className="flex items-center gap-5">
              {brand.logo_url ? (
                <div className="w-24 h-24 rounded-3xl bg-white border border-border flex items-center justify-center p-4 shadow-sm shrink-0">
                  <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain"/>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center shrink-0">
                  <Tag className="w-8 h-8 text-muted-foreground"/>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-xl font-semibold truncate">{brand.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2">ترتيب العرض {brand.sort_order}</p>
                  </div>
                  <span className={cn("px-3 py-1.5 rounded-full text-xs font-medium border shrink-0",brand.is_active?"bg-green-500/10 text-green-600 border-green-500/20":"bg-red-500/10 text-red-600 border-red-500/20")}>
                    {brand.is_active?"نشط":"معطل"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <span>{(brandToCategoryIds[brand.id]||[]).length} أقسام</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border">
              <Button size="sm" variant="outline" className="rounded-2xl" onClick={()=>toggleActiveMutation.mutate({id:brand.id,is_active:!brand.is_active})}>
                {brand.is_active?"تعطيل":"تفعيل"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-2xl gap-2" onClick={()=>handleEdit(brand)}>
                <Pencil className="w-4 h-4"/>
                تعديل
              </Button>
              <Button size="icon" variant="outline" className="rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={()=>{if(confirm("هل أنت متأكد من حذف هذه الماركة؟")) deleteMutation.mutate(brand.id)}}>
                <Trash2 className="w-4 h-4"/>
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredBrands.length===0&&(
          <div className="text-center py-16 text-muted-foreground">
            <Tag className="w-14 h-14 mx-auto mb-4 opacity-40"/>
            <p>لا توجد ماركات</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBrands.map((brand,index)=>(
          <motion.div key={brand.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:index*0.04}} className="group relative bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <div className="flex items-start justify-between gap-3">
              <span className={cn("px-3 py-1.5 rounded-full text-xs font-medium border",brand.is_active?"bg-green-500/10 text-green-600 border-green-500/20":"bg-red-500/10 text-red-600 border-red-500/20")}>
                {brand.is_active?"نشط":"معطل"}
              </span>
              <Switch checked={brand.is_active??true} onCheckedChange={(checked)=>toggleActiveMutation.mutate({id:brand.id,is_active:checked})}/>
            </div>
            <div className="mt-6 flex justify-center">
              {brand.logo_url?(
                <div className="w-32 h-32 rounded-3xl bg-white border border-border flex items-center justify-center p-6 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain"/>
                </div>
              ):(
                <div className="w-32 h-32 rounded-3xl bg-muted flex items-center justify-center">
                  <Tag className="w-10 h-10 text-muted-foreground"/>
                </div>
              )}
            </div>
            <div className="text-center mt-6">
              <h3 className="font-heading text-xl font-semibold">{brand.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">{(brandToCategoryIds[brand.id]||[]).length} أقسام مرتبطة</p>
              <p className="text-xs text-muted-foreground mt-1">ترتيب العرض {brand.sort_order}</p>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 pt-5 border-t border-border">
              <Button size="icon" variant="ghost" className="rounded-2xl hover:bg-muted" onClick={()=>handleEdit(brand)}>
                <Pencil className="w-4 h-4"/>
              </Button>
              <Button size="icon" variant="ghost" className="rounded-2xl text-destructive hover:bg-destructive/10" onClick={()=>{if(confirm("هل أنت متأكد من حذف هذه الماركة؟")) deleteMutation.mutate(brand.id)}}>
                <Trash2 className="w-4 h-4"/>
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredBrands.length===0&&(
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Tag className="w-14 h-14 mx-auto mb-4 opacity-40"/>
            <p>لا توجد ماركات</p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {isDialogOpen && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">
                  {editingBrand ? 'تعديل الماركة' : 'إضافة ماركة جديدة'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label>اسم الماركة</Label>
                  <Input
                    className="h-12 rounded-2xl"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: ROLEX"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>الشعار</Label>
                  <div className="flex gap-3">
                    <Input
                      value={formData.logo_url}
                      onChange={(e) =>
                        setFormData({ ...formData, logo_url: e.target.value })
                      }
                      placeholder="رابط الصورة"
                      className="h-12 rounded-2xl flex-1"
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                      />
                      <span className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-input bg-background hover:bg-muted transition">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </span>
                    </label>
                  </div>
                  {formData.logo_url && (
                    <div className="relative mx-auto mt-4 w-40 h-40 rounded-3xl bg-muted border border-border flex items-center justify-center">
                      <img
                        src={formData.logo_url}
                        alt="Preview"
                        className="w-full h-full object-contain p-6"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>النطاق</Label>
                  <p className="text-sm text-muted-foreground">هذه الماركة تعمل على المتجر الموحد</p>
                </div>

                <div className="space-y-2">
                  <Label>الأقسام المرتبطة</Label>
                  <div className="max-h-60 overflow-auto rounded-3xl border border-border p-4 space-y-3 bg-muted/20">
                    {categories.map((category) => {
                      const parent = category.parent_id ? categoryById.get(category.parent_id) : null;
                      const checked = selectedCategoryIds.includes(category.id);
                      return (
                        <label key={category.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              if (value) {
                                setSelectedCategoryIds((prev) => (prev.includes(category.id) ? prev : [...prev, category.id]));
                              } else {
                                setSelectedCategoryIds((prev) => prev.filter((id) => id !== category.id));
                              }
                            }}
                          />
                          <span>
                            {parent ? `${parent.name_ar} / ${category.name_ar}` : category.name_ar}
                          </span>
                        </label>
                      );
                    })}
                    {categories.length === 0 && (
                      <p className="text-xs text-muted-foreground">لا توجد أقسام فعالة حالياً</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">اختيار الأقسام هنا يحدد أين تظهر هذه الماركة في صفحة الأقسام.</p>
                </div>

                <div className="space-y-2">
                  <Label>ترتيب العرض</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-3xl border border-border">
                  <Label className="cursor-pointer">تفعيل الماركة</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <Button type="submit" className="flex-1 btn-gold" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="flex-1 h-12 rounded-2xl btn-gold" />
                        جاري الحفظ...
                      </>
                    ) : 'حفظ'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="h-12 rounded-2xl">
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBrandsPage;