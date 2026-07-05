import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Plus, Trash2, Scale } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Account { id: string; code: string; name_ar: string; type: string; }
interface Line { account_id: string; debit: number; credit: number; description?: string; }
interface Tx {
  id: string; entry_date: string; reference: string | null; description: string;
  created_at: string; transaction_lines: { debit: number; credit: number; account_id: string; chart_of_accounts: { name_ar: string; code: string } | null }[];
}

export default function AdminLedgerPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { account_id: '', debit: 0, credit: 0 },
    { account_id: '', debit: 0, credit: 0 },
  ]);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from('chart_of_accounts').select('id, code, name_ar, type').eq('is_active', true).order('code'),
      supabase.from('financial_transactions').select('id, entry_date, reference, description, created_at, transaction_lines(debit, credit, account_id, chart_of_accounts(name_ar, code))').order('entry_date', { ascending: false }).limit(100),
    ]);
    setAccounts((a as Account[]) || []);
    setTxs((t as unknown as Tx[]) || []);
    setLoading(false);
  }

  async function save() {
    if (!balanced) return toast({ title: 'القيد غير متوازن', description: 'مجموع المدين يجب أن يساوي مجموع الدائن', variant: 'destructive' });
    if (!description.trim()) return toast({ title: 'الوصف مطلوب', variant: 'destructive' });
    const valid = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (valid.length < 2) return toast({ title: 'يجب وجود سطرين على الأقل', variant: 'destructive' });

    const { data: tx, error } = await supabase.from('financial_transactions')
      .insert({ entry_date: entryDate, reference: reference || null, description }).select().single();
    if (error || !tx) return toast({ title: 'خطأ', description: error?.message, variant: 'destructive' });
    const { error: lerr } = await supabase.from('transaction_lines').insert(
      valid.map(l => ({ transaction_id: tx.id, account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || null }))
    );
    if (lerr) return toast({ title: 'خطأ', description: lerr.message, variant: 'destructive' });
    toast({ title: 'تم حفظ القيد' });
    setOpen(false); setReference(''); setDescription('');
    setLines([{ account_id: '', debit: 0, credit: 0 }, { account_id: '', debit: 0, credit: 0 }]);
    fetchAll();
  }

  async function deleteTx(id: string) {
    if (!confirm('حذف القيد؟')) return;
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
    if (error) return toast({ title: 'خطأ', variant: 'destructive' });
    toast({ title: 'تم الحذف' }); fetchAll();
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-2" dir="rtl">
      <AdminPageHeader
        category="المالية"
        title="دفتر اليومية"
        description="قيود محاسبية بنظام القيد المزدوج"
        actions={[
          {
            label: "قيد جديد",
            icon: Plus,
            onClick: () => setOpen(true),
            variant: "primary",
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة قيد محاسبي</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs mb-1 block">التاريخ</label><Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} /></div>
                <div><label className="text-xs mb-1 block">المرجع (اختياري)</label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="رقم الفاتورة..." /></div>
              </div>
              <div><label className="text-xs mb-1 block">الوصف</label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="font-medium text-sm">سطور القيد</span><Button size="sm" variant="outline" onClick={() => setLines([...lines, { account_id: '', debit: 0, credit: 0 }])}><Plus className="w-3 h-3 ml-1" />سطر</Button></div>
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <Select value={l.account_id} onValueChange={v => { const c = [...lines]; c[i].account_id = v; setLines(c); }}>
                        <SelectTrigger><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                        <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name_ar}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input className="col-span-3" type="number" step="0.01" placeholder="مدين" value={l.debit || ''} onChange={e => { const c = [...lines]; c[i].debit = Number(e.target.value) || 0; c[i].credit = 0; setLines(c); }} />
                    <Input className="col-span-3" type="number" step="0.01" placeholder="دائن" value={l.credit || ''} onChange={e => { const c = [...lines]; c[i].credit = Number(e.target.value) || 0; c[i].debit = 0; setLines(c); }} />
                    <Button className="col-span-1" size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <div className={`flex items-center justify-between p-3 rounded-lg ${balanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  <Scale className="w-4 h-4" />
                  <span className="text-sm">مدين: {totalDebit.toFixed(2)} | دائن: {totalCredit.toFixed(2)} | الفرق: {(totalDebit - totalCredit).toFixed(2)}</span>
                </div>
              </div>
              <Button className="w-full" disabled={!balanced} onClick={save}>حفظ القيد</Button>
            </div>
          </DialogContent>
        </Dialog>

      <Card>
        <CardHeader><CardTitle className="text-base">آخر القيود</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">جاري التحميل...</p> :
            txs.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">لا توجد قيود بعد</p> : (
            <div className="space-y-3">
              {txs.map(tx => (
                <div key={tx.id} className="border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.entry_date} {tx.reference && `• ${tx.reference}`}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteTx(tx.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead className="h-7">الحساب</TableHead><TableHead className="h-7 text-left">مدين</TableHead><TableHead className="h-7 text-left">دائن</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {tx.transaction_lines.map((l, i) => (
                        <TableRow key={i}><TableCell className="py-1.5">{l.chart_of_accounts?.code} - {l.chart_of_accounts?.name_ar}</TableCell><TableCell className="py-1.5 text-left">{Number(l.debit) > 0 ? Number(l.debit).toFixed(2) : '—'}</TableCell><TableCell className="py-1.5 text-left">{Number(l.credit) > 0 ? Number(l.credit).toFixed(2) : '—'}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}