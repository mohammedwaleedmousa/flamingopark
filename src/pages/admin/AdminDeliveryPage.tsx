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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Truck, Search, Loader2, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  const [search, setSearch] = useState('');
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

  const filteredCompanies = companies?.filter((c) => {
    const matchesCountry = filterCountry === 'all' || c.country === filterCountry;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchesCountry && matchesSearch;
  }) || [];

  const stats = {
    total: companies?.length || 0,
    sa: companies?.filter(c => c.country === 'SA').length || 0,
    ye: companies?.filter(c => c.country === 'YE').length || 0,
    active: companies?.filter(c => c.is_active).length || 0,
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
      <AdminPageHeader
        category="الإدارة"
        title="شركات التوصيل"
        description={`${stats.total} شركة • ${stats.active} نشطة`}
        actions={[
          {
            label: "إضافة شركة",
            icon: Plus,
            onClick: () => { 
              resetForm(); 
              setIsDialogOpen(true); 
            },
            variant: "primary",
          },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'الكل', value: stats.total, filter: 'all', color: 'from-primary/20 to-primary/10 border-primary/20' },
          { label: '🇸🇦 السعودية', value: stats.sa, filter: 'SA', color: 'from-green-500/20 to-green-500/10 border-green-500/20' },
          { label: '🇾🇪 اليمن', value: stats.ye, filter: 'YE', color: 'from-red-500/20 to-red-500/10 border-red-500/20' },
          { label: 'نشطة', value: stats.active, filter: 'active', color: 'from-blue-500/20 to-blue-500/10 border-blue-500/20' },
        ].map((stat) => (
          <button
            key={stat.filter}
            onClick={() => setFilterCountry(stat.filter === 'active' ? 'all' : stat.filter)}
            className={cn(
              "p-4 rounded-xl text-center transition-all border bg-gradient-to-br",
              stat.color,
              filterCountry === stat.filter && 'ring-2 ring-offset-2 ring-primary'
            )}
          >
            <p className="text-2xl font-heading">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن شركة توصيل..."
            className="pr-10 bg-card"
            dir="rtl"
          />
        </div>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-full sm:w-40 bg-card">
            <SelectValue placeholder="فلترة حسب الدولة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الدول</SelectItem>
            <SelectItem value="SA">🇸🇦 السعودية</SelectItem>
            <SelectItem value="YE">🇾🇪 اليمن</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredCompanies.map((company, index) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-foreground">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {company.country === 'SA' ? '🇸🇦 السعودية' : '🇾🇪 اليمن'}
                  </p>
                </div>
              </div>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium shrink-0 border",
                company.is_active 
                  ? 'bg-green-500/15 text-green-600 border-green-500/30' 
                  : 'bg-red-500/15 text-red-600 border-red-500/30'
              )}>
                {company.is_active ? 'نشط' : 'معطل'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <DollarSign className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">الرسوم</p>
                  <p className="font-heading text-sm">{company.base_fee} {company.country === 'SA' ? 'ر.س' : 'ر.ي'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">المدة</p>
                  <p className="font-heading text-sm">{company.delivery_days || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => toggleActiveMutation.mutate({ id: company.id, is_active: !company.is_active })}
              >
                {company.is_active ? 'تعطيل' : 'تفعيل'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleEdit(company)}
              >
                <Pencil className="w-4 h-4" />
                تعديل
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('هل أنت متأكد من حذف هذه الشركة؟')) {
                    deleteMutation.mutate(company.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredCompanies.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد شركات توصيل</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-right p-4 font-heading text-sm">الشركة</th>
              <th className="text-right p-4 font-heading text-sm">الدولة</th>
              <th className="text-right p-4 font-heading text-sm">رسوم التوصيل</th>
              <th className="text-right p-4 font-heading text-sm">مدة التوصيل</th>
              <th className="text-right p-4 font-heading text-sm">الحالة</th>
              <th className="text-right p-4 font-heading text-sm">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-heading">{company.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-lg">{company.country === 'SA' ? '🇸🇦' : '🇾🇪'}</span>
                  <span className="text-sm text-muted-foreground mr-2">
                    {company.country === 'SA' ? 'السعودية' : 'اليمن'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="font-heading text-primary">{company.base_fee} {company.country === 'SA' ? 'ر.س' : 'ر.ي'}</span>
                </td>
                <td className="p-4 text-muted-foreground">
                  {company.delivery_days || '-'}
                </td>
                <td className="p-4">
                  <Switch
                    checked={company.is_active ?? true}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: company.id, is_active: checked })
                    }
                  />
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:bg-muted"
                      onClick={() => handleEdit(company)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذه الشركة؟')) {
                          deleteMutation.mutate(company.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد شركات توصيل</p>
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
                  {editingCompany ? 'تعديل الشركة' : 'إضافة شركة جديدة'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم الشركة</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: أرامكس"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>الدولة</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'SA', label: '🇸🇦 السعودية' },
                      { value: 'YE', label: '🇾🇪 اليمن' },
                    ].map((country) => (
                      <button
                        key={country.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, country: country.value })}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-all",
                          formData.country === country.value
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted border-border hover:border-primary/50'
                        )}
                      >
                        {country.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>رسوم التوصيل (ر.س)</Label>
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

                <div className="space-y-2">
                  <Label>مدة التوصيل</Label>
                  <Input
                    value={formData.delivery_days}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_days: e.target.value })
                    }
                    placeholder="مثال: 2-3 أيام"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <Label className="cursor-pointer">تفعيل الشركة</Label>
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

export default AdminDeliveryPage;