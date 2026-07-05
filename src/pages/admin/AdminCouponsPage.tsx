import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Loader2, Percent, Banknote, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  is_active: boolean;
  countries: string[];
}

interface CouponStats {
  code: string;
  usageCount: number;
  totalDiscount: number;
}

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponStats, setCouponStats] = useState<CouponStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    is_active: true,
    countries: ['SA', 'YE'] as string[],
  });

  useEffect(() => {
    fetchCoupons();
    fetchCouponStats();
  }, []);

  const fetchCoupons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الكوبونات', variant: 'destructive' });
    } else {
      setCoupons((data || []).map(c => ({
        ...c,
        type: c.type as 'percentage' | 'fixed'
      })));
    }
    setIsLoading(false);
  };

  const fetchCouponStats = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('coupon_code, discount_amount')
      .not('coupon_code', 'is', null);

    if (!error && data) {
      const statsMap: Record<string, { usageCount: number; totalDiscount: number }> = {};
      
      data.forEach(order => {
        const code = order.coupon_code?.toUpperCase() || '';
        if (code) {
          if (!statsMap[code]) {
            statsMap[code] = { usageCount: 0, totalDiscount: 0 };
          }
          statsMap[code].usageCount += 1;
          statsMap[code].totalDiscount += Number(order.discount_amount) || 0;
        }
      });

      const statsArray = Object.entries(statsMap).map(([code, stats]) => ({
        code,
        usageCount: stats.usageCount,
        totalDiscount: stats.totalDiscount,
      }));

      setCouponStats(statsArray);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      is_active: true,
      countries: ['SA', 'YE'],
    });
    setEditingCoupon(null);
  };

  const openDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        is_active: coupon.is_active,
        countries: coupon.countries || ['SA', 'YE'],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال كود الكوبون', variant: 'destructive' });
      return;
    }
    if (formData.value <= 0) {
      toast({ title: 'خطأ', description: 'يرجى إدخال قيمة صالحة', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update({
            code: formData.code.trim().toUpperCase(),
            type: formData.type,
            value: formData.value,
            is_active: formData.is_active,
            countries: formData.countries,
          })
          .eq('id', editingCoupon.id);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث الكوبون' });
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert({
            code: formData.code.trim().toUpperCase(),
            type: formData.type,
            value: formData.value,
            is_active: formData.is_active,
            countries: formData.countries,
          });
        if (error) throw error;
        toast({ title: 'تم', description: 'تم إضافة الكوبون' });
      }
      setIsDialogOpen(false);
      fetchCoupons();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;

    const { error } = await supabase.from('coupons').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف الكوبون', variant: 'destructive' });
    } else {
      setCoupons(coupons.filter(c => c.id !== id));
      toast({ title: 'تم', description: 'تم حذف الكوبون' });
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' });
    } else {
      setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'تم', description: 'تم نسخ الكود' });
  };

  const toggleCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-foreground">إدارة الكوبونات</h1>
        <Button onClick={() => openDialog()} className="btn-gold gap-2">
          <Plus className="w-4 h-4" />
          إضافة كوبون
        </Button>
      </div>

      {/* Coupon Stats Report */}
      {couponStats.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            تقرير استخدام الكوبونات
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-2 font-heading">الكوبون</th>
                  <th className="text-right p-2 font-heading">عدد الاستخدامات</th>
                  <th className="text-right p-2 font-heading">إجمالي الخصومات</th>
                </tr>
              </thead>
              <tbody>
                {couponStats.map((stat) => (
                  <tr key={stat.code} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-mono text-primary">{stat.code}</td>
                    <td className="p-2">{stat.usageCount} مرة</td>
                    <td className="p-2 text-green-600">{stat.totalDiscount.toFixed(0)} ر.س/ر.ي</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-heading">
                  <td className="p-2">الإجمالي</td>
                  <td className="p-2">{couponStats.reduce((sum, s) => sum + s.usageCount, 0)} مرة</td>
                  <td className="p-2 text-green-600">{couponStats.reduce((sum, s) => sum + s.totalDiscount, 0).toFixed(0)} ر.س/ر.ي</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <div key={coupon.id} className={`bg-card border rounded-lg p-4 ${!coupon.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button onClick={() => copyCode(coupon.code)} className="font-mono text-lg font-bold text-gold hover:text-gold-light">
                  {coupon.code}
                </button>
                <Copy className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-gold" onClick={() => copyCode(coupon.code)} />
              </div>
              <Switch checked={coupon.is_active} onCheckedChange={() => toggleActive(coupon)} />
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              {coupon.type === 'percentage' ? (
                <span className="flex items-center gap-1 text-green-500">
                  <Percent className="w-4 h-4" />
                  {coupon.value}%
                </span>
              ) : (
                <span className="flex items-center gap-1 text-blue-500">
                  <Banknote className="w-4 h-4" />
                  {coupon.value} ريال
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {coupon.countries?.map(c => (
                  <span key={c} className="text-xs">{c === 'SA' ? '🇸🇦' : '🇾🇪'}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => openDialog(coupon)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCoupon(coupon.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {coupons.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            لا توجد كوبونات. أضف كوبوناً جديداً للبدء.
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">كود الكوبون</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="مثال: gold50"
                className="font-mono"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">نوع الخصم</label>
              <Select
                value={formData.type}
                onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت (ريال)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                {formData.type === 'percentage' ? 'نسبة الخصم (%)' : 'مبلغ الخصم (ريال)'}
              </label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                min={0}
                max={formData.type === 'percentage' ? 100 : undefined}
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">البلدان</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.countries.includes('SA')}
                    onCheckedChange={() => toggleCountry('SA')}
                  />
                  <span>🇸🇦 السعودية</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.countries.includes('YE')}
                    onCheckedChange={() => toggleCountry('YE')}
                  />
                  <span>🇾🇪 اليمن</span>
                </label>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <span>الكوبون نشط</span>
            </label>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} disabled={isSaving} className="flex-1 btn-gold">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCoupon ? 'تحديث' : 'إضافة'}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCouponsPage;
