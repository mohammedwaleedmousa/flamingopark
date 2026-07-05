import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, Plus, Trash2, TrendingDown } from 'lucide-react';

interface Category { id: string; name_ar: string; }
interface Method { id: string; name_ar: string; }
interface Expense {
  id: string; expense_date: string; amount: number; description: string; vendor: string | null;
  category_id: string | null; payment_method_id: string | null;
  expense_categories: { name_ar: string } | null;
  payment_methods: { name_ar: string } | null;
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().slice(0, 10), category_id: '', amount: '', description: '', vendor: '', payment_method_id: '', notes: '' });

  useEffect(() => { fetchAll(); }, []);
  async function fetchAll() {
    setLoading(true);
    const [{ data: e }, { data: c }, { data: m }] = await Promise.all([
      supabase.from('expenses').select('*, expense_categories(name_ar), payment_methods(name_ar)').order('expense_date', { ascending: false }).limit(200),
      supabase.from('expense_categories').select('id, name_ar').eq('is_active', true).order('name_ar'),
      supabase.from('payment_methods').select('id, name_ar').eq('is_active', true).order('sort_order'),
    ]);
    setExpenses((e as unknown as Expense[]) || []);
    setCategories((c as Category[]) || []);
    setMethods((m as Method[]) || []);
    setLoading(false);
  }
  async function save() {
    if (!form.amount || !form.description.trim()) return toast({ title: 'الحقول المطلوبة ناقصة', variant: 'destructive' });
    const { error } = await supabase.from('expenses').insert({
      expense_date: form.expense_date, amount: Number(form.amount), description: form.description,
      vendor: form.vendor || null, category_id: form.category_id || null,
      payment_method_id: form.payment_method_id || null, notes: form.notes || null,
    });
    if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    toast({ title: 'تم حفظ المصروف' }); setOpen(false);
    setForm({ expense_date: new Date().toISOString().slice(0, 10), category_id: '', amount: '', description: '', vendor: '', payment_method_id: '', notes: '' });
    fetchAll();
  }
  async function del(id: string) {
    if (!confirm('حذف المصروف؟')) return;
    await supabase.from('expenses').delete().eq('id', id); toast({ title: 'تم الحذف' }); fetchAll();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const thisMonth = expenses.filter(e => e.expense_date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" /> المصروفات التشغيلية</h1>
          <p className="text-sm text-muted-foreground">إيجار، رواتب، تسويق، مرافق...</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ml-1" />مصروف جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مصروف</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                <Input type="number" step="0.01" placeholder="المبلغ *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <Input placeholder="الوصف *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="التصنيف" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.payment_method_id} onValueChange={v => setForm({ ...form, payment_method_id: v })}>
                  <SelectTrigger><SelectValue placeholder="طريقة الدفع" /></SelectTrigger>
                  <SelectContent>{methods.map(m => <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="المورد (اختياري)" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
              <Textarea placeholder="ملاحظات" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              <Button className="w-full" onClick={save}>حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">إجمالي السجلات</p><p className="text-2xl font-bold mt-1">{expenses.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">إجمالي المبالغ</p><p className="text-2xl font-bold mt-1 text-rose-600">{total.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">هذا الشهر</p><p className="text-2xl font-bold mt-1 text-rose-600">{thisMonth.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">السجل</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">...</p> :
            expenses.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد مصروفات</p> : (
            <div className="space-y-2">
              {expenses.map(e => (
                <div key={e.id} className="border rounded-lg p-3 flex items-start gap-3 flex-wrap">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><TrendingDown className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-medium text-sm">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.expense_date} • {e.expense_categories?.name_ar || '—'} {e.vendor && `• ${e.vendor}`} {e.payment_methods?.name_ar && `• ${e.payment_methods.name_ar}`}</p>
                  </div>
                  <div className="text-left"><p className="font-bold">{Number(e.amount).toFixed(2)}</p></div>
                  <Button size="icon" variant="ghost" onClick={() => del(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}