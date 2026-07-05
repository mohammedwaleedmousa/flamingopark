import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Method { id: string; code: string; name: string; name_ar: string; type: string; is_active: boolean; sort_order: number; }
interface Settlement {
  id: string; settlement_date: string; payment_method_id: string | null; expected_amount: number;
  actual_amount: number; difference: number; status: string; notes: string | null;
  payment_methods: { name_ar: string } | null;
}

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [open, setOpen] = useState(false);
  const [sOpen, setSOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', name_ar: '', type: 'cash' });
  const [sForm, setSForm] = useState({ payment_method_id: '', settlement_date: new Date().toISOString().slice(0, 10), expected_amount: '', actual_amount: '', notes: '' });

  useEffect(() => { fetchAll(); }, []);
  async function fetchAll() {
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from('payment_methods').select('*').order('sort_order'),
      supabase.from('payment_settlements').select('*, payment_methods(name_ar)').order('settlement_date', { ascending: false }).limit(50),
    ]);
    setMethods((m as Method[]) || []);
    setSettlements((s as unknown as Settlement[]) || []);
  }
  async function saveMethod() {
    if (!form.code || !form.name_ar) return toast({ title: 'الكود والاسم مطلوبان', variant: 'destructive' });
    const { error } = await supabase.from('payment_methods').insert({ ...form, name: form.name || form.name_ar });
    if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    toast({ title: 'تم' }); setOpen(false); setForm({ code: '', name: '', name_ar: '', type: 'cash' }); fetchAll();
  }
  async function toggleMethod(id: string, v: boolean) {
    await supabase.from('payment_methods').update({ is_active: v }).eq('id', id); fetchAll();
  }
  async function delMethod(id: string) {
    if (!confirm('حذف طريقة الدفع؟')) return;
    await supabase.from('payment_methods').delete().eq('id', id); fetchAll();
  }
  async function saveSettlement() {
    if (!sForm.payment_method_id) return toast({ title: 'اختر طريقة الدفع', variant: 'destructive' });
    const { error } = await supabase.from('payment_settlements').insert({
      payment_method_id: sForm.payment_method_id, settlement_date: sForm.settlement_date,
      expected_amount: Number(sForm.expected_amount) || 0, actual_amount: Number(sForm.actual_amount) || 0,
      notes: sForm.notes || null, status: 'reconciled',
    });
    if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    toast({ title: 'تم حفظ التسوية' }); setSOpen(false);
    setSForm({ payment_method_id: '', settlement_date: new Date().toISOString().slice(0, 10), expected_amount: '', actual_amount: '', notes: '' });
    fetchAll();
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-2" dir="rtl">
      <AdminPageHeader
        category="الإدارة"
        title="طرق الدفع والتسويات"
        description="إدارة طرق الدفع المتعددة وتسوية الحسابات"
        actions={[
          {
            label: "طريقة دفع جديدة",
            icon: Plus,
            onClick: () => setOpen(true),
            variant: "primary",
          },
        ]}
      />

      <Tabs defaultValue="methods">
        <TabsList><TabsTrigger value="methods">طرق الدفع</TabsTrigger><TabsTrigger value="settlements">التسويات</TabsTrigger></TabsList>

        <TabsContent value="methods" className="space-y-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>إضافة طريقة دفع</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="الكود (مثل visa)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                  <Input placeholder="الاسم بالعربية" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} />
                  <Input placeholder="الاسم بالإنجليزية (اختياري)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank">بنكي</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                      <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={saveMethod}>حفظ</Button>
                </div>
              </DialogContent>
            </Dialog>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {methods.map(m => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{m.code} • {m.type}</p>
                  </div>
                  <Switch checked={m.is_active} onCheckedChange={v => toggleMethod(m.id, v)} />
                  <Button size="icon" variant="ghost" onClick={() => delMethod(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={sOpen} onOpenChange={setSOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 ml-1" />تسوية جديدة</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>تسوية طريقة دفع</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={sForm.payment_method_id} onValueChange={v => setSForm({ ...sForm, payment_method_id: v })}>
                    <SelectTrigger><SelectValue placeholder="طريقة الدفع" /></SelectTrigger>
                    <SelectContent>{methods.map(m => <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={sForm.settlement_date} onChange={e => setSForm({ ...sForm, settlement_date: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="المبلغ المتوقع" value={sForm.expected_amount} onChange={e => setSForm({ ...sForm, expected_amount: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="المبلغ الفعلي" value={sForm.actual_amount} onChange={e => setSForm({ ...sForm, actual_amount: e.target.value })} />
                  <Input placeholder="ملاحظات" value={sForm.notes} onChange={e => setSForm({ ...sForm, notes: e.target.value })} />
                  <Button className="w-full" onClick={saveSettlement}>حفظ</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              {settlements.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد تسويات</p> : (
                <div className="divide-y">
                  {settlements.map(s => (
                    <div key={s.id} className="p-3 flex items-center gap-3 flex-wrap">
                      <ArrowRightLeft className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-[160px]">
                        <p className="font-medium text-sm">{s.payment_methods?.name_ar || '—'} • {s.settlement_date}</p>
                        <p className="text-xs text-muted-foreground">متوقع {Number(s.expected_amount).toFixed(2)} / فعلي {Number(s.actual_amount).toFixed(2)}</p>
                      </div>
                      <Badge className={Number(s.difference) === 0 ? 'bg-green-100 text-green-700' : Number(s.difference) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}>
                        فرق: {Number(s.difference).toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}