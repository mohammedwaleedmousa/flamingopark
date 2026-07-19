import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Refund {
  id: string; refund_number: string; order_number: string | null; customer_name: string | null;
  amount: number; reason: string; status: string; refund_method: string; created_at: string; notes: string | null;
}

const STATUSES: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'موافق عليه', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  processed: { label: 'تمت المعالجة', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ order_number: '', customer_name: '', amount: '', reason: '', refund_method: 'cash', notes: '' });

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('refunds').select('*').order('created_at', { ascending: false }).limit(100);
    setRefunds((data as Refund[]) || []); setLoading(false);
  }
  async function save() {
    if (!form.amount || !form.reason.trim()) return toast({ title: 'الحقول المطلوبة ناقصة', variant: 'destructive' });
    const { error } = await supabase.from('refunds').insert({
      order_number: form.order_number || null, customer_name: form.customer_name || null,
      amount: Number(form.amount), reason: form.reason, refund_method: form.refund_method, notes: form.notes || null,
    });
    if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    toast({ title: 'تم إضافة المرتجع' }); setOpen(false);
    setForm({ order_number: '', customer_name: '', amount: '', reason: '', refund_method: 'cash', notes: '' });
    fetch();
  }
  async function updateStatus(id: string, status: string) {
    const upd: Record<string, unknown> = { status };
    if (status === 'processed') upd.processed_at = new Date().toISOString();
    const { error } = await supabase.from('refunds').update(upd).eq('id', id);
    if (error) return toast({ title: 'خطأ', variant: 'destructive' });
    toast({ title: 'تم التحديث' }); fetch();
  }

  const totalPending = refunds.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
  const totalProcessed = refunds.filter(r => r.status === 'processed').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto px-4 md:px-6 py-8" dir="rtl">
      <AdminPageHeader
        category="المالية"
        title="المرتجعات والاسترجاع"
        description="إدارة طلبات استرجاع الأموال"
        actions={[
          {
            label: "مرتجع جديد",
            icon: Plus,
            onClick: () => setOpen(true),
            variant: "primary",
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="rounded-3xl max-w-xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                إضافة مرتجع جديد
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="رقم الطلب"
                  className="h-12 rounded-2xl"
                  value={form.order_number}
                  onChange={e => setForm({ ...form, order_number: e.target.value })}
                />
                <Input placeholder="اسم العميل" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" step="0.01" placeholder="المبلغ *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                <Select value={form.refund_method} onValueChange={v => setForm({ ...form, refund_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="bank">تحويل بنكي</SelectItem>
                    <SelectItem value="store_credit">رصيد متجر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="سبب الإرجاع *" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              <Textarea placeholder="ملاحظات" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              <Button
                className="w-full h-12 rounded-2xl bg-pink-500 hover:bg-pink-600"
                onClick={save}
              >
                حفظ المرتجع
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">إجمالي المرتجعات</p><p className="text-2xl font-bold mt-1">{refunds.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">قيد المراجعة</p><p className="text-2xl font-bold mt-1 text-amber-600">{totalPending.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">تمت معالجته</p><p className="text-2xl font-bold mt-1 text-green-600">{totalProcessed.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">القائمة</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">...</p> :
            refunds.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد مرتجعات</p> : (
            <div className="space-y-2">
              {refunds.map(r => {
                const s = STATUSES[r.status] || STATUSES.pending;
                const Icon = s.icon;
                return (
                  <div key={r.id} className="border rounded-lg p-3 flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{r.refund_number}</span>
                        <Badge className={s.color}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">{r.customer_name || '—'} {r.order_number && `· #${r.order_number}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{Number(r.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{r.refund_method}</p>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'approved')}>موافقة</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'rejected')}>رفض</Button>
                      </div>
                    )}
                    {r.status === 'approved' && <Button size="sm" onClick={() => updateStatus(r.id, 'processed')}>تأكيد المعالجة</Button>}
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