import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Link2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Brand {
  id: string;
  name: string;
  is_active: boolean | null;
}

interface Category {
  id: string;
  name_ar: string;
  parent_id: string | null;
  is_active: boolean | null;
}

interface BrandCategoryRow {
  brand_id: string;
  category_id: string;
}

const AdminBrandCategoryMapPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [pendingByBrand, setPendingByBrand] = useState<Record<string, string[]>>({});

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['map-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id,name,is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as Brand[];
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['map-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name_ar,parent_id,is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ['map-brand-categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brand_categories')
        .select('brand_id,category_id');
      if (error) throw error;
      return (data || []) as BrandCategoryRow[];
    },
  });

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const linksByBrand = useMemo(() => {
    const acc: Record<string, string[]> = {};
    rows.forEach((r) => {
      if (!acc[r.brand_id]) acc[r.brand_id] = [];
      acc[r.brand_id].push(r.category_id);
    });
    return acc;
  }, [rows]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const getSelection = (brandId: string) => pendingByBrand[brandId] ?? linksByBrand[brandId] ?? [];

  const toggleSelection = (brandId: string, categoryId: string, checked: boolean) => {
    const current = getSelection(brandId);
    const next = checked ? (current.includes(categoryId) ? current : [...current, categoryId]) : current.filter((id) => id !== categoryId);
    setPendingByBrand((prev) => ({ ...prev, [brandId]: next }));
  };

  const saveBrandMutation = useMutation({
    mutationFn: async ({ brandId, categoryIds }: { brandId: string; categoryIds: string[] }) => {
      const { error: delError } = await (supabase as any)
        .from('brand_categories')
        .delete()
        .eq('brand_id', brandId);
      if (delError) throw delError;

      if (categoryIds.length > 0) {
        const payload = categoryIds.map((categoryId) => ({ brand_id: brandId, category_id: categoryId }));
        const { error: insError } = await (supabase as any)
          .from('brand_categories')
          .insert(payload);
        if (insError) throw insError;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['map-brand-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-mapped-brands'] });
      toast({ title: 'تم الحفظ', description: `تم تحديث ربط ${brands.find((b) => b.id === vars.brandId)?.name || 'الماركة'}` });
      setPendingByBrand((prev) => {
        const clone = { ...prev };
        delete clone[vars.brandId];
        return clone;
      });
    },
    onError: (error: any) => {
      toast({ title: 'حدث خطأ', description: error?.message || 'فشل حفظ الربط', variant: 'destructive' });
    },
  });

  const isLoading = brandsLoading || categoriesLoading || rowsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="الكتالوج"
        title="ربط الماركات بالأقسام"
        description="إدارة جماعية لظهور الماركات داخل الأقسام"
      />

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

      <div className="space-y-4">
        {filteredBrands.map((brand) => {
          const selected = getSelection(brand.id);
          const dirty = pendingByBrand[brand.id] !== undefined;
          return (
            <div key={brand.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg">{brand.name}</h3>
                  <p className="text-xs text-muted-foreground">عدد الأقسام المرتبطة: {selected.length}</p>
                </div>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={!dirty || saveBrandMutation.isPending}
                  onClick={() => saveBrandMutation.mutate({ brandId: brand.id, categoryIds: selected })}
                >
                  {saveBrandMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  حفظ الربط
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {categories.map((category) => {
                  const parent = category.parent_id ? categoryById.get(category.parent_id) : null;
                  const checked = selected.includes(category.id);
                  return (
                    <label
                      key={`${brand.id}-${category.id}`}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleSelection(brand.id, category.id, !!v)}
                      />
                      <span className="text-sm">
                        {parent ? `${parent.name_ar} / ${category.name_ar}` : category.name_ar}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredBrands.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            لا توجد ماركات مطابقة للبحث
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBrandCategoryMapPage;
