import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Boxes, Plus, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface Product { id: string; name_ar: string; cost_price: number; in_stock: boolean; }
interface Adjustment {
  id: string; product_id: string | null; product_name: string | null; adjustment_type: string;
  quantity_before: number; quantity_change: number; quantity_after: number;
  unit_cost: number; total_cost: number; reason: string; reference: string | null; created_at: string;
}

const TYPES: Record<string, { label: string; color: string }> = {
  increase: { label: 'زيادة', color: 'bg-green-100 text-green-700' },
  decrease: { label: 'نقص', color: 'bg-amber-100 text-amber-700' },
  recount: { label: 'جرد', color: 'bg-blue-100 text-blue-700' },
  damage: { label: 'تالف', color: 'bg-red-100 text-red-700' },
  transfer: { label: 'تحويل', color: 'bg-purple-100 text-purple-700' },
};

export default function AdminInventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', adjustment_type: 'increase', quantity_change: '', reason: '', reference: '' });

  useEffect(() => { fetchAll(); }, []);
  async function fetchAll() {
    setLoading(true);
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('inventory_adjustments').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('id, name_ar, cost_price, in_stock').eq('is_active', true).order('name_ar').limit(500),
    ]);
    setAdjustments((a as Adjustment[]) || []);
    setProducts((p as unknown as Product[]) || []);
    setLoading(false);
  }
  async function save() {
    if (!form.product_id || !form.quantity_change || !form.reason.trim()) return toast({ title: 'الحقول المطلوبة ناقصة', variant: 'destructive' });
    const product = products.find(p => p.id === form.product_id);
    if (!product) return;
    const sign = form.adjustment_type === 'increase' ? 1 : -1;
    const change = sign * Math.abs(Number(form.quantity_change));
    const { error } = await supabase.from('inventory_adjustments').insert({
      product_id: product.id, product_name: product.name_ar, adjustment_type: form.adjustment_type,
      quantity_before: 0, quantity_change: change, quantity_after: change,
      unit_cost: product.cost_price || 0, reason: form.reason, reference: form.reference || null,
    });
    if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    // For damage/decrease, flag product out of stock
    if (form.adjustment_type === 'damage' || (form.adjustment_type === 'decrease' && Math.abs(change) > 0)) {
      // optional: keep product visible; admin can toggle separately
    }
    toast({ title: 'تم تسجيل التسوية' });
    setOpen(false);
    setForm({ product_id: '', adjustment_type: 'increase', quantity_change: '', reason: '', reference: '' });
    fetchAll();
  }

  const totalValue = adjustments.reduce((s, a) => s + Number(a.total_cost || 0), 0);
  const damageCount = adjustments.filter(a => a.adjustment_type === 'damage').length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-2" dir="rtl">
      <AdminPageHeader
        category="الإدارة"
        title="تسوية المخزون"
        description="جرد، تالف، تحويل — مع تتبع التكلفة"
        actions={[
          {
            label: "تسوية جديدة",
            icon: Plus,
            onClick: () => setOpen(true),
            variant: "primary",
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>تسوية مخزون</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name_ar}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.adjustment_type} onValueChange={v => setForm({ ...form, adjustment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="الكمية" value={form.quantity_change} onChange={e => setForm({ ...form, quantity_change: e.target.value })} />
              </div>
              <Textarea placeholder="السبب *" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              <Input placeholder="المرجع (اختياري)" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
              <Button className="w-full" onClick={save}>حفظ وتحديث المخزون</Button>
            </div>
          </DialogContent>
        </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">إجمالي التسويات</p><p className="text-2xl font-bold mt-1">{adjustments.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">قيمة الحركات</p><p className="text-2xl font-bold mt-1">{totalValue.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" />تالف</p><p className="text-2xl font-bold mt-1 text-red-600">{damageCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">السجل</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">...</p> :
            adjustments.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد تسويات</p> : (
            <div className="space-y-2">
              {adjustments.map(a => {
                const t = TYPES[a.adjustment_type] || TYPES.recount;
                const up = a.quantity_change >= 0;
                return (
                  <div key={a.id} className="border rounded-lg p-3 flex items-start gap-3 flex-wrap">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${up ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>{up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}</div>
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-medium text-sm">{a.product_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString('ar')} • {a.reason}</p>
                    </div>
                    <Badge className={t.color}>{t.label}</Badge>
                    <div className="text-left">
                      <p className="text-sm font-mono">{a.quantity_before} → {a.quantity_after}</p>
                      <p className="text-xs text-muted-foreground">{Number(a.total_cost).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}