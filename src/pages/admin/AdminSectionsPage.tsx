import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, GripVertical, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';


interface HomepageSection {
  id: string;
  title: string;
  title_ar: string;
  section_type: string;
  filter_type: string;
  countries: string[];
  is_active: boolean;
  sort_order: number;
  max_products: number;
  show_view_all: boolean;
  view_all_link: string | null;
}

const filterTypes = [
  { value: 'featured', label: 'منتجات مميزة' },
  { value: 'best_seller', label: 'الأكثر مبيعاً' },
  { value: 'discounted', label: 'عروض وخصومات' },
  { value: 'new', label: 'منتجات جديدة' },
  { value: 'all', label: 'جميع المنتجات' },
];

const AdminSectionsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    section_type: 'products',
    filter_type: 'featured',
    countries: ['SA', 'YE'],
    is_active: true,
    sort_order: 0,
    max_products: 8,
    show_view_all: true,
    view_all_link: '',
  });

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['homepage-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as HomepageSection[];
    },
  });

  // Fetch product counts for each section
  const { data: productCounts = {} } = useQuery({
    queryKey: ['section-product-counts', sections.map(s => s.id)],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      
      for (const section of sections) {
        const { count, error } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .contains('section_ids', [section.id]);
        
        if (!error) {
          counts[section.id] = count || 0;
        }
      }
      
      return counts;
    },
    enabled: sections.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('homepage_sections').insert({
        title: data.title,
        title_ar: data.title_ar,
        section_type: data.section_type,
        filter_type: data.filter_type,
        countries: data.countries,
        is_active: data.is_active,
        sort_order: data.sort_order,
        max_products: data.max_products,
        show_view_all: data.show_view_all,
        view_all_link: data.view_all_link || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('تم إضافة القسم بنجاح');
      resetForm();
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة القسم'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('homepage_sections')
        .update({
          title: data.title,
          title_ar: data.title_ar,
          section_type: data.section_type,
          filter_type: data.filter_type,
          countries: data.countries,
          is_active: data.is_active,
          sort_order: data.sort_order,
          max_products: data.max_products,
          show_view_all: data.show_view_all,
          view_all_link: data.view_all_link || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('تم تحديث القسم بنجاح');
      resetForm();
    },
    onError: () => toast.error('حدث خطأ أثناء تحديث القسم'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('homepage_sections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('تم حذف القسم بنجاح');
    },
    onError: () => toast.error('حدث خطأ أثناء حذف القسم'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('homepage_sections')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      title_ar: '',
      section_type: 'products',
      filter_type: 'featured',
      countries: ['SA', 'YE'],
      is_active: true,
      sort_order: 0,
      max_products: 8,
      show_view_all: true,
      view_all_link: '',
    });
    setEditingSection(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (section: HomepageSection) => {
    setEditingSection(section);
    setFormData({
      title: section.title,
      title_ar: section.title_ar,
      section_type: section.section_type,
      filter_type: section.filter_type,
      countries: section.countries,
      is_active: section.is_active,
      sort_order: section.sort_order,
      max_products: section.max_products,
      show_view_all: section.show_view_all,
      view_all_link: section.view_all_link || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getFilterLabel = (value: string) => {
    return filterTypes.find(f => f.value === value)?.label || value;
  };

  return (
    <div className="p-4 md:p-6">
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-heading text-foreground">أقسام الصفحة الرئيسية</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة قسم
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSection ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>العنوان (إنجليزي)</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>العنوان (عربي)</Label>
                    <Input
                      value={formData.title_ar}
                      onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                      required
                      dir="rtl"
                    />
                  </div>
                </div>

                <div>
                  <Label>نوع الفلتر</Label>
                  <Select
                    value={formData.filter_type}
                    onValueChange={(value) => setFormData({ ...formData, filter_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filterTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الترتيب</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>عدد المنتجات</Label>
                    <Input
                      type="number"
                      value={formData.max_products}
                      onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) || 8 })}
                    />
                  </div>
                </div>

                <div>
                  <Label>رابط "عرض الكل"</Label>
                  <Input
                    value={formData.view_all_link}
                    onChange={(e) => setFormData({ ...formData, view_all_link: e.target.value })}
                    placeholder="/products"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>نشط</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.show_view_all}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_view_all: checked })}
                    />
                    <Label>إظهار "عرض الكل"</Label>
                  </div>
                </div>

                <div>
                  <Label>الدول</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.countries.includes('SA')}
                        onChange={(e) => {
                          const newCountries = e.target.checked
                            ? [...formData.countries, 'SA']
                            : formData.countries.filter((c) => c !== 'SA');
                          setFormData({ ...formData, countries: newCountries });
                        }}
                        className="rounded border-input"
                      />
                      السعودية
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.countries.includes('YE')}
                        onChange={(e) => {
                          const newCountries = e.target.checked
                            ? [...formData.countries, 'YE']
                            : formData.countries.filter((c) => c !== 'YE');
                          setFormData({ ...formData, countries: newCountries });
                        }}
                        className="rounded border-input"
                      />
                      اليمن
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingSection ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>نوع الفلتر</TableHead>
                    <TableHead>المنتجات المُعينة</TableHead>
                    <TableHead>الحد الأقصى</TableHead>
                    <TableHead>الدول</TableHead>
                    <TableHead>نشط</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{section.title_ar}</div>
                          <div className="text-sm text-muted-foreground">{section.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getFilterLabel(section.filter_type)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (productCounts[section.id] || 0) > 0 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {productCounts[section.id] || 0} منتج
                        </span>
                      </TableCell>
                      <TableCell>{section.max_products}</TableCell>
                      <TableCell>{section.countries?.join(', ')}</TableCell>
                      <TableCell>
                        <Switch
                          checked={section.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: section.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(section)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(section.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSectionsPage;
