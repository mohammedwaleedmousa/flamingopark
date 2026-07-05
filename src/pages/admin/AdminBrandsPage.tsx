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
      .upload(fileName, file);

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
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
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
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'الكل', value: stats.total, color: 'from-primary/20 to-primary/10 border-primary/20' },
          { label: 'نشطة', value: stats.active, color: 'from-green-500/20 to-green-500/10 border-green-500/20' },
          { label: 'معطلة', value: stats.inactive, color: 'from-red-500/20 to-red-500/10 border-red-500/20' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "p-4 rounded-xl text-center border bg-gradient-to-br",
              stat.color
            )}
          >
            <p className="text-2xl font-heading">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن ماركة..."
          className="pr-10 bg-card"
          dir="rtl"
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredBrands.map((brand, index) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-4">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-16 h-16 object-contain bg-muted rounded-lg p-2"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  <Tag className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-foreground truncate">{brand.name}</h3>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium shrink-0 border",
                    brand.is_active 
                      ? 'bg-green-500/15 text-green-600 border-green-500/30' 
                      : 'bg-red-500/15 text-red-600 border-red-500/30'
                  )}>
                    {brand.is_active ? 'نشط' : 'معطل'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>الترتيب: {brand.sort_order}</span>
                    <span>•</span>
                    <span>الأقسام: {(brandToCategoryIds[brand.id] || []).length}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => toggleActiveMutation.mutate({ id: brand.id, is_active: !brand.is_active })}
              >
                {brand.is_active ? 'تعطيل' : 'تفعيل'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleEdit(brand)}
              >
                <Pencil className="w-4 h-4" />
                تعديل
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('هل أنت متأكد من حذف هذه الماركة؟')) {
                    deleteMutation.mutate(brand.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredBrands.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد ماركات</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-right p-4 font-heading text-sm">الشعار</th>
              <th className="text-right p-4 font-heading text-sm">الاسم</th>
              <th className="text-right p-4 font-heading text-sm">الأقسام</th>
              <th className="text-right p-4 font-heading text-sm">الترتيب</th>
              <th className="text-right p-4 font-heading text-sm">الحالة</th>
              <th className="text-right p-4 font-heading text-sm">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredBrands.map((brand) => (
              <tr key={brand.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="h-12 w-12 object-contain bg-muted rounded-lg p-1"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                      <Tag className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="p-4 font-heading">{brand.name}</td>
                <td className="p-4 text-muted-foreground">{(brandToCategoryIds[brand.id] || []).length}</td>
                <td className="p-4 text-muted-foreground">{brand.sort_order}</td>
                <td className="p-4">
                  <Switch
                    checked={brand.is_active ?? true}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: brand.id, is_active: checked })
                    }
                  />
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:bg-muted"
                      onClick={() => handleEdit(brand)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذه الماركة؟')) {
                          deleteMutation.mutate(brand.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBrands.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد ماركات</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {isDialogOpen && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  {editingBrand ? 'تعديل الماركة' : 'إضافة ماركة جديدة'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم الماركة</Label>
                  <Input
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
                  <div className="flex gap-2">
                    <Input
                      value={formData.logo_url}
                      onChange={(e) =>
                        setFormData({ ...formData, logo_url: e.target.value })
                      }
                      placeholder="رابط الصورة"
                      className="flex-1"
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                      />
                      <Button type="button" variant="outline" size="icon" disabled={uploading}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </label>
                  </div>
                  {formData.logo_url && (
                    <div className="relative w-fit">
                      <img
                        src={formData.logo_url}
                        alt="Preview"
                        className="h-20 object-contain bg-muted rounded-lg p-2"
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
                  <div className="max-h-48 overflow-auto rounded-lg border border-border p-2 space-y-2 bg-background">
                    {categories.map((category) => {
                      const parent = category.parent_id ? categoryById.get(category.parent_id) : null;
                      const checked = selectedCategoryIds.includes(category.id);
                      return (
                        <label key={category.id} className="flex items-center gap-2 text-sm cursor-pointer">
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

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <Label className="cursor-pointer">تفعيل الماركة</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 btn-gold" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري الحفظ...
                      </>
                    ) : 'حفظ'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
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