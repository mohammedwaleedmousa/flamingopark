import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Customer {
  id: string;
  name: string;
  phone: string;
  country: string;
  created_at: string;
}

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل العملاء', variant: 'destructive' });
    } else {
      setCustomers(data || []);
    }
    setIsLoading(false);
  };

  const openWhatsApp = (customer: Customer) => {
    // أرقام التواصل حسب البلد
    const storePhones = {
      YE: '967782676054',
      SA: '966557302919'
    };
    const toPhone = customer.phone.replace(/\D/g, '');
    const message = `مرحباً ${customer.name}`;
    // فتح واتساب
    window.open(`https://wa.me/${toPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف العميل', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف العميل بنجاح' });
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl text-foreground">العملاء</h1>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="pr-10"
          dir="rtl"
        />
      </div>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right p-4 font-heading text-sm">الاسم</th>
                <th className="text-right p-4 font-heading text-sm">الهاتف</th>
                <th className="text-right p-4 font-heading text-sm">البلد</th>
                <th className="text-right p-4 font-heading text-sm">تاريخ التسجيل</th>
                <th className="text-right p-4 font-heading text-sm">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-4 font-body">{customer.name}</td>
                  <td className="p-4 font-mono text-sm" dir="ltr">{customer.phone}</td>
                  <td className="p-4">{customer.country === 'SA' ? '🇸🇦 السعودية' : '🇾🇪 اليمن'}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openWhatsApp(customer)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف العميل</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف العميل "{customer.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCustomer(customer.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {isLoading ? 'جاري التحميل...' : 'لا يوجد عملاء'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomersPage;
