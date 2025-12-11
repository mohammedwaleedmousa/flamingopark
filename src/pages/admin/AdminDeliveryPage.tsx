import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface DeliveryCompany {
  id: string;
  name: string;
  country: string;
  base_fee: number;
  delivery_days: string | null;
  is_active: boolean | null;
}

const AdminDeliveryPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<DeliveryCompany | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    country: 'SA',
    base_fee: 0,
    delivery_days: '',
    is_active: true,
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-delivery-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_companies')
        .select('*')
        .order('country', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as DeliveryCompany[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('delivery_companies')
          .update({
            name: data.name,
            country: data.country,
            base_fee: data.base_fee,
            delivery_days: data.delivery_days || null,
            is_active: data.is_active,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_companies')
          .insert({
            name: data.name,
            country: data.country,
            base_fee: data.base_fee,
            delivery_days: data.delivery_days || null,
            is_active: data.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-companies'] });
      toast({ title: editingCompany ? 'تم تحديث الشركة' : 'تم إضافة الشركة' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'حدث خطأ', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-companies'] });
      toast({ title: 'تم حذف الشركة' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('delivery_companies')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-companies'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      country: 'SA',
      base_fee: 0,
      delivery_days: '',
      is_active: true,
    });
    setEditingCompany(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (company: DeliveryCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      country: company.country,
      base_fee: company.base_fee,
      delivery_days: company.delivery_days || '',
      is_active: company.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingCompany?.id,
    });
  };

  const filteredCompanies = companies?.filter((c) =>
    filterCountry === 'all' ? true : c.country === filterCountry
  );

  if (isLoading) {
    return <div className="p-6 text-center">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة شركات التوصيل</h1>
        <div className="flex gap-4">
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="فلترة حسب الدولة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الدول</SelectItem>
              <SelectItem value="SA">السعودية 🇸🇦</SelectItem>
              <SelectItem value="YE">اليمن 🇾🇪</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة شركة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCompany ? 'تعديل الشركة' : 'إضافة شركة جديدة'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>اسم الشركة</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>الدولة</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) =>
                      setFormData({ ...formData, country: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SA">السعودية 🇸🇦</SelectItem>
                      <SelectItem value="YE">اليمن 🇾🇪</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>رسوم التوصيل الأساسية</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.base_fee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        base_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>مدة التوصيل</Label>
                  <Input
                    value={formData.delivery_days}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_days: e.target.value })
                    }
                    placeholder="مثال: 2-3 أيام"
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
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم الشركة</TableHead>
            <TableHead>الدولة</TableHead>
            <TableHead>رسوم التوصيل</TableHead>
            <TableHead>مدة التوصيل</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCompanies?.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>
                {company.country === 'SA' ? '🇸🇦 السعودية' : '🇾🇪 اليمن'}
              </TableCell>
              <TableCell>
                {company.base_fee} {company.country === 'SA' ? 'ريال' : 'ريال'}
              </TableCell>
              <TableCell>{company.delivery_days || '-'}</TableCell>
              <TableCell>
                <Switch
                  checked={company.is_active ?? true}
                  onCheckedChange={(checked) =>
                    toggleActiveMutation.mutate({ id: company.id, is_active: checked })
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(company)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(company.id)}
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

export default AdminDeliveryPage;
