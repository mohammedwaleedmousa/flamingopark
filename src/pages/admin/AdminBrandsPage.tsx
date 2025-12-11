import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

const AdminBrandsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    countries: ['SA', 'YE'] as string[],
    is_active: true,
    sort_order: 0,
  });
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

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('brands')
          .update({
            name: data.name,
            logo_url: data.logo_url || null,
            countries: data.countries,
            is_active: data.is_active,
            sort_order: data.sort_order,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brands')
          .insert({
            name: data.name,
            logo_url: data.logo_url || null,
            countries: data.countries,
            is_active: data.is_active,
            sort_order: data.sort_order,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      toast({ title: editingBrand ? 'تم تحديث الماركة' : 'تم إضافة الماركة' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'حدث خطأ', variant: 'destructive' });
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
      countries: ['SA', 'YE'],
      is_active: true,
      sort_order: 0,
    });
    setEditingBrand(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      logo_url: brand.logo_url || '',
      countries: brand.countries || ['SA', 'YE'],
      is_active: brand.is_active ?? true,
      sort_order: brand.sort_order ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingBrand?.id,
    });
  };

  const handleCountryChange = (country: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, countries: [...formData.countries, country] });
    } else {
      setFormData({
        ...formData,
        countries: formData.countries.filter((c) => c !== country),
      });
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الماركات</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة ماركة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? 'تعديل الماركة' : 'إضافة ماركة جديدة'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>اسم الماركة</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label>الشعار</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.logo_url}
                    onChange={(e) =>
                      setFormData({ ...formData, logo_url: e.target.value })
                    }
                    placeholder="رابط الصورة"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    <Button type="button" variant="outline" disabled={uploading}>
                      <Upload className="w-4 h-4" />
                    </Button>
                  </label>
                </div>
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Preview"
                    className="mt-2 h-16 object-contain"
                  />
                )}
              </div>

              <div>
                <Label>الدول</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.countries.includes('SA')}
                      onCheckedChange={(checked) =>
                        handleCountryChange('SA', checked as boolean)
                      }
                    />
                    السعودية
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.countries.includes('YE')}
                      onCheckedChange={(checked) =>
                        handleCountryChange('YE', checked as boolean)
                      }
                    />
                    اليمن
                  </label>
                </div>
              </div>

              <div>
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

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label>مفعّل</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الشعار</TableHead>
            <TableHead>الاسم</TableHead>
            <TableHead>الدول</TableHead>
            <TableHead>الترتيب</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands?.map((brand) => (
            <TableRow key={brand.id}>
              <TableCell>
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs">
                    لا يوجد
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{brand.name}</TableCell>
              <TableCell>
                {brand.countries?.map((c) => (c === 'SA' ? '🇸🇦' : '🇾🇪')).join(' ')}
              </TableCell>
              <TableCell>{brand.sort_order}</TableCell>
              <TableCell>
                <Switch
                  checked={brand.is_active ?? true}
                  onCheckedChange={(checked) =>
                    toggleActiveMutation.mutate({ id: brand.id, is_active: checked })
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(brand)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(brand.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminBrandsPage;
