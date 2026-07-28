import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Refund {
  id: string;
  refund_number: string;
  order_number: string | null;
  customer_name: string | null;
  amount: number;
  reason: string;
  status: string;
  refund_method: string;
  created_at: string;
  notes: string | null;
  items:any[];
  orders?: {
  id:string;
  order_number:string;
  items:any[];
  total:number;
  } | null;
}

const STATUSES: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: {
    label: 'قيد المراجعة',
    color: 'bg-amber-100 text-amber-700',
    icon: Clock,
  },
  reviewing: {
    label: 'جاري الفحص',
    color: 'bg-purple-100 text-purple-700',
    icon: Clock,
  },
  approved: {
    label: 'تمت الموافقة',
    color: 'bg-blue-100 text-blue-700',
    icon: CheckCircle,
  },
  processing: {
    label: 'جاري التحويل',
    color: 'bg-indigo-100 text-indigo-700',
    icon: Clock,
  },
  completed: {
    label: 'مكتمل',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  rejected: {
    label: 'مرفوض',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  cancelled: {
    label: 'ملغي',
    color: 'bg-gray-100 text-gray-700',
    icon: XCircle,
  },
};

export default function AdminRefundsPage() {
  const [selectedRefunds, setSelectedRefunds] = useState<string[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    order_id: '',
    order_number: '',
    customer_id: '',
    customer_name: '',
    amount: '',
    reason: '',
    refund_method: 'cash',
    notes: '',
    items: []
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [searchOrder, setSearchOrder] = useState('');

  useEffect(() => { fetch(); }, []);
  async function searchOrders(value: string) {
    setSearchOrder(value);

    if (!value.trim()) {
      setOrders([]);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        customer_name,
        customer_phone,
        total,
        items
        `)
      .ilike('order_number', `%${value}%`)
      .limit(10);

    if (!error) {
      setOrders(data || []);
    }
  }
  async function fetch() {

  setLoading(true);

  const { data, error } = await supabase
    .from('refunds')
    .select(`
      *,
      orders (
        id,
        order_number,
        items,
        total
      )
    `)
    .order('created_at', { ascending: false })
    .range(0,1000);


  if(error){
    console.log(error);
    setLoading(false);
    return;
  }


  const refundsWithProducts = await Promise.all(

    (data || []).map(async (refund:any)=>{


      if(!refund.items || refund.items.length === 0){
        return refund;
      }


      const productIds = refund.items
        .map((item:any)=>item.product_id)
        .filter(Boolean);



      if(productIds.length === 0){
        return refund;
      }



      const {data:products}=await supabase
        .from("products")
        .select(`
          id,
          name,
          images
        `)
        .in("id",productIds);



      const items = refund.items.map((item:any)=>{


        const product = products?.find(
          p=>p.id===item.product_id
        );


        return {
          ...item,
          name:
            item.name ||
            product?.name ||
            "منتج",

          image:
            item.image ||
            product?.images?.[0] ||
            "/placeholder.png"
        };

      });



      return {
        ...refund,
        items
      };


    })

  );



  setRefunds(refundsWithProducts as Refund[]);

  setLoading(false);
}


    async function save() {
      if (!form.amount || !form.reason.trim()) return toast({ title: 'الحقول المطلوبة ناقصة', variant: 'destructive' });
      const { error } = await supabase.from('refunds').insert({
        order_id: form.order_id || null,
        order_number: form.order_number || null,
        customer_id: form.customer_id || null,
        customer_name: form.customer_name || null,
        amount: Number(form.amount),
        reason: form.reason,
        refund_method: form.refund_method,
        notes: form.notes || null,
        items: form.items,
        status: "pending",
      });
      if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      toast({ title: 'تم إضافة المرتجع' }); setOpen(false);
      setForm({
        order_id: '',
        order_number: '',
        customer_id: '',
        customer_name: '',
        amount: '',
        reason: '',
        refund_method: 'cash',
        notes: '',
        items: []
      });
      fetch();
    }
    async function deleteRefund(id: string) {
      const confirmDelete = window.confirm(
        "هل أنت متأكد من حذف هذا المرتجع؟"
      );
      if (!confirmDelete) return;
      const { error } = await supabase
        .from("refunds")
        .delete()
        .eq("id", id);
      if (error) {
        return toast({
          title: "خطأ",
          description: error.message,
          variant: "destructive",
        });
      }
      toast({
        title: "تم حذف المرتجع",
      });
      fetch();
    }
    async function updateStatus(id: string, status: string) {
      const upd: Database['public']['Tables']['refunds']['Update'] = { status };
      if (status === 'completed') upd.processed_at = new Date().toISOString();
      const { error } = await supabase.from('refunds').update(upd).eq('id', id);
      if (error) return toast({ title: 'خطأ', variant: 'destructive' });
      toast({ title: 'تم التحديث' }); fetch();
    }

    async function deleteSelectedRefunds() {

    if (selectedRefunds.length === 0) return;

    const confirmDelete = window.confirm(
      `هل تريد حذف ${selectedRefunds.length} مرتجع؟`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('refunds')
      .delete()
      .in('id', selectedRefunds);

    if (error) {
      return toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }

    toast({
      title: `تم حذف ${selectedRefunds.length} مرتجع`,
    });

    setSelectedRefunds([]);
    fetch();
  }

    const totalPending = refunds.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
    const totalProcessed = refunds
      .filter(r => r.status === 'completed')
      .reduce((s, r) => s + Number(r.amount), 0);

    function toggleSelectAll() {
      if (selectedRefunds.length === refunds.length) {
        setSelectedRefunds([]);
      } else {
        setSelectedRefunds(refunds.map(r => r.id));
      }
    }

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
    ...(selectedRefunds.length > 0
      ? [
          {
            label: `حذف ${selectedRefunds.length}`,
            icon: Trash2,
            onClick: deleteSelectedRefunds,
            variant: "destructive" as const,
          },
        ]
      : []),
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
              <div className="space-y-2">
                <Input
                  placeholder="ابحث برقم الطلب"
                  value={searchOrder}
                  onChange={(e)=>searchOrders(e.target.value)}
                  />
                  {orders.length > 0 && (
                  <div className="border rounded-xl overflow-hidden">
                  {orders.map(order => (
                  <button
                  key={order.id}
                  type="button"
                  className="w-full p-3 text-right hover:bg-muted"
                  onClick={()=>{
                  setForm({
                    ...form,
                    order_id: order.id,
                    order_number: order.order_number,
                    customer_name: order.customer_name,
                    customer_id: order.customer_id || '',
                    amount: order.total,
                    reason: form.reason,
                    refund_method: form.refund_method,
                    notes: form.notes,
                    items: order.items || []
                    });
                  setOrders([]);
                  }}
                  >
                  <div className="font-bold">
                  #{order.order_number}
                  </div>
                  <div className="text-sm text-muted-foreground">
                  {order.customer_name}
                  </div>
                  <div>
                  {order.total}
                  </div>
                  </button>
                  ))}
                  </div>
                  )}
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
              <div className="flex items-center gap-2 mb-4">
              <input
              type="checkbox"
              checked={
              selectedRefunds.length === refunds.length &&
              refunds.length > 0
              }
              onChange={toggleSelectAll}
              />

              <span>
              تحديد الكل ({refunds.length})
              </span>

              </div>
              {refunds.map(r => {
                const s = STATUSES[r.status] || STATUSES.pending;
                const Icon = s.icon;
                return (
                  <div
key={r.id}
className="border rounded-lg p-3 flex items-start gap-3 flex-wrap"
>
<input
type="checkbox"
checked={selectedRefunds.includes(r.id)}
onChange={(e)=>{

if(e.target.checked){

setSelectedRefunds([
...selectedRefunds,
r.id
]);

}else{

setSelectedRefunds(
selectedRefunds.filter(id=>id!==r.id)
);

}

}}
/>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{r.refund_number}</span>
                        <Badge className={s.color}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">{r.customer_name || '—'} {r.order_number && `· #${r.order_number}`}</p>
                      {r.items?.length > 0 && (
                        <details className="mt-3 border rounded-xl p-3">

                          <summary className="cursor-pointer font-medium">
                          عرض منتجات الطلب ({r.items.length})
                          </summary>

                        <div className="mt-3 space-y-3">

                          {r.items.map((item:any,index:number)=>(

                            <div
                              key={index}
                              className="flex items-center gap-3 border-b pb-2"
                            >
                              <img
                                src={item.image || "/placeholder.png"}
                                className="w-16 h-16 rounded-lg object-cover"
                                />
                              <div className="flex-1">
                                <p className="font-medium">
                                  {item.name || item.product_name || "منتج"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                الكمية: {item.quantity || 1}
                                </p>

                                <p className="text-sm">
                                السعر: {Number(item.price || 0).toFixed(2)}
                                </p>

                                <p className="text-sm font-medium">
                                الإجمالي:
                                {Number(
                                (item.price || 0) * (item.quantity || 1)
                                ).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
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
                    {r.status === 'approved' &&
                    <Button
                    size="sm"
                    onClick={() => updateStatus(r.id, 'processing')}
                    >
                    بدء التحويل
                    </Button>}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteRefund(r.id)}
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      حذف
                    </Button>
                    {r.status === 'processing' &&
                    <Button
                    size="sm"
                    onClick={() => updateStatus(r.id, 'completed')}
                    >
                    تأكيد الاكتمال
                    </Button>}
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