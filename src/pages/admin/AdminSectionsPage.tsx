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
import AdminPageHeader from '@/components/admin/AdminPageHeader';


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
  const SINGLE_COUNTRY = 'GLOBAL';
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    section_type: 'products',
    filter_type: 'featured',
    countries: [SINGLE_COUNTRY],
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
      countries: [SINGLE_COUNTRY],
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
      countries: [SINGLE_COUNTRY],
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
    const submitData = { ...formData, countries: [SINGLE_COUNTRY] as string[] };
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getFilterLabel = (value: string) => {
    return filterTypes.find(f => f.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen max-w-[1500px] mx-auto px-4 md:px-6 py-8 space-y-8" dir="rtl">
      <AdminPageHeader
        category="المحتوى"
        title="أقسام الصفحة الرئيسية"
        description={`إدارة ${sections.length} أقسام عرض المنتجات في المتجر`}
        actions={[
          {
            label: "إضافة قسم",
            icon: Plus,
            onClick: () => {
              resetForm();
              setIsDialogOpen(true);
            },
            variant: "primary",
          },
        ]}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSection ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label>نوع الفلتر</Label>
                  <Select
                    value={formData.filter_type}
                    onValueChange={(value) => setFormData({ ...formData, filter_type: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  <Label>النطاق</Label>
                  <p className="text-sm text-muted-foreground mt-2">القسم يعمل ضمن المتجر الموحد</p>
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

        {isLoading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <Card className="border-border rounded-3xl overflow-hidden shadow-sm">
  <CardContent className="p-0">

    <div className="overflow-x-auto">

      <Table className="table-fixed" dir="rtl">

        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">

            <TableHead className="w-[60px] text-center">
            </TableHead>


            <TableHead className="w-[300px] text-right font-heading text-sm text-foreground">
              القسم
            </TableHead>


            <TableHead className="w-[220px] text-right font-heading text-sm text-foreground">
              نوع الفلتر
            </TableHead>


            <TableHead className="w-[160px] text-right font-heading text-sm text-foreground">
              المنتجات
            </TableHead>


            <TableHead className="w-[120px] text-right font-heading text-sm text-foreground">
              الحد الأقصى
            </TableHead>


            <TableHead className="w-[120px] text-right font-heading text-sm text-foreground">
              الحالة
            </TableHead>


            <TableHead className="w-[120px] text-right font-heading text-sm text-foreground">
              الإجراءات
            </TableHead>

          </TableRow>
        </TableHeader>


        <TableBody>

          {sections.map((section)=>(

            <TableRow
              key={section.id}
              className="hover:bg-pink-50/40 transition-colors"
            >


              <TableCell className="text-center">
                <GripVertical 
                  className="w-4 h-4 mx-auto text-muted-foreground cursor-grab"
                />
              </TableCell>



              <TableCell dir="rtl">

                <div className="space-y-1">

                  <p className="font-heading font-semibold text-foreground">
                    {section.title_ar}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {section.title}
                  </p>

                </div>

              </TableCell>



              <TableCell dir="rtl">

                <span className="
                  inline-flex
                  px-3
                  py-1
                  rounded-full
                  bg-muted
                  text-xs
                  font-medium
                ">
                  {getFilterLabel(section.filter_type)}
                </span>

              </TableCell>



              <TableCell dir="rtl">

                <span
                  className={`
                    inline-flex
                    px-3
                    py-1
                    rounded-full
                    text-xs
                    font-medium
                    ${
                      (productCounts[section.id] || 0) > 0
                      ? "bg-pink-500/10 text-pink-600"
                      : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {productCounts[section.id] || 0} منتج
                </span>

              </TableCell>



              <TableCell dir="rtl">

                <span className="font-medium">
                  {section.max_products}
                </span>

              </TableCell>



              <TableCell dir="rtl">

                <Switch
                  checked={section.is_active}
                  className="data-[state=checked]:bg-pink-500"
                  onCheckedChange={(checked)=>
                    toggleActiveMutation.mutate({
                      id:section.id,
                      is_active:checked
                    })
                  }
                />

              </TableCell>



              <TableCell dir="rtl">

                <div className="flex items-center gap-2">

                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl hover:bg-pink-50 hover:text-pink-600"
                    onClick={()=>handleEdit(section)}
                  >
                    <Pencil className="w-4 h-4"/>
                  </Button>


                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl text-destructive hover:bg-red-50"
                    onClick={()=>deleteMutation.mutate(section.id)}
                  >
                    <Trash2 className="w-4 h-4"/>
                  </Button>

                </div>

              </TableCell>


            </TableRow>

          ))}

        </TableBody>

      </Table>

    </div>

  </CardContent>
</Card>
        )}
    </div>
  );
};

export default AdminSectionsPage;
