import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, ExternalLink, Trash2, Calendar, Loader2, Printer, Eye, Pencil, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import InvoiceEditor from '@/components/admin/InvoiceEditor';
import NewInvoiceCreator from '@/components/admin/NewInvoiceCreator';

interface InvoiceFile {
  name: string;
  created_at: string;
  url: string;
  orderNumber: string;
}

interface SelectedAccessory {
  name: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  selected_size?: string | null;
  selected_accessories?: SelectedAccessory[];
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  country: string;
  created_at: string;
  delivery_companies?: {
    name: string;
  } | null;
}

const AdminInvoicesPage = () => {
  const [invoices, setInvoices] = useState<InvoiceFile[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceFile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchOrders();
  }, []);

  useEffect(() => {
    filterInvoices();
    filterOrders();
  }, [searchQuery, dateFilter, invoices, orders]);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, delivery_companies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersData = (data || []).map(order => ({
        ...order,
        items: order.items as unknown as OrderItem[],
      }));

      setOrders(ordersData as Order[]);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الطلبات',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const invoiceFiles: InvoiceFile[] = (data || [])
        .filter(file => file.name.endsWith('.pdf'))
        .map(file => {
          const { data: urlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(file.name);
          
          const orderMatch = file.name.match(/invoice-([^-]+)-/);
          const orderNumber = orderMatch ? orderMatch[1] : 'غير معروف';

          return {
            name: file.name,
            created_at: file.created_at || new Date().toISOString(),
            url: urlData.publicUrl,
            orderNumber,
          };
        });

      setInvoices(invoiceFiles);
      setFilteredInvoices(invoiceFiles);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الفواتير',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (searchQuery) {
      filtered = filtered.filter(inv => 
        inv.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(inv => {
        const invoiceDate = format(new Date(inv.created_at), 'yyyy-MM-dd');
        return invoiceDate === dateFilter;
      });
    }

    setFilteredInvoices(filtered);
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone.includes(searchQuery)
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
        return orderDate === dateFilter;
      });
    }

    setFilteredOrders(filtered);
  };

  const handleDelete = async (fileName: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.storage
        .from('invoices')
        .remove([fileName]);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف الفاتورة بنجاح',
      });

      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الفاتورة',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('');
  };

  const handlePrint = (url: string) => {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleOpenInvoiceEditor = (order: Order) => {
    setSelectedOrder(order);
    setShowInvoiceEditor(true);
  };

  const handleCloseInvoiceEditor = () => {
    setShowInvoiceEditor(false);
    setSelectedOrder(null);
  };

  const handleOrderUpdated = () => {
    fetchOrders();
    fetchInvoices();
  };

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto px-4 md:px-6 py-6" dir="rtl">
      <AdminPageHeader
        category="المالية"
        title="إدارة الفواتير"
        description={`إدارة ${invoices.length.toLocaleString("ar-EG")} فاتورة محفوظة`}
        actions={[
          {
            label: "فاتورة جديدة",
            icon: Plus,
            onClick: () => setShowNewInvoice(true),
            variant: "primary",
          },
        ]}
      />

      {/* Filters */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-semibold">
                البحث والتصفية
              </h3>

              <p className="text-xs text-muted-foreground mt-1">
                البحث عن الفواتير والطلبات
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-500/10 text-pink-600 text-sm font-medium">
              <FileText className="w-4 h-4" />
              {invoices.length} فاتورة
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_auto] gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الطلب أو اسم العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-2xl pr-11 bg-background"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-12 rounded-2xl pr-11 bg-background"
              />
            </div>
            <Button variant="outline" className="h-12 rounded-2xl" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Orders and Uploaded Invoices */}
      <Tabs defaultValue="orders" className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50 p-1">
          <TabsTrigger
            value="orders"
            className="rounded-xl gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm h-10"
          >
            <Pencil className="w-4 h-4" />
            إنشاء/تعديل الفواتير ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="rounded-xl gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="w-4 h-4" />
            الفواتير المحفوظة ({filteredInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab - Create/Edit Invoices */}
        <TabsContent value="orders">
          <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoadingOrders ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    جاري تحميل الطلبات...
                  </p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-pink-500/10 flex items-center justify-center mb-5">
                    <FileText className="w-10 h-10 text-pink-500" />
                  </div>

                  <h3 className="font-heading text-lg font-semibold">
                    لا توجد طلبات
                  </h3>

                  <p className="text-sm text-muted-foreground mt-2">
                    لا يوجد طلبات متاحة لإنشاء فواتير حالياً
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl" dir="rtl">
                  <Table className="table-fixed text-right">
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow className="h-14 hover:bg-transparent">
                        <TableHead className="text-right px-5 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">رقم الطلب</TableHead>
                        <TableHead className="text-right px-5 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">العميل</TableHead>
                        <TableHead className="text-right px-5 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">الإجمالي</TableHead>
                        <TableHead className="text-right px-5 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">التاريخ</TableHead>
                        <TableHead className="text-right px-5 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} className="h-20 border-b hover:bg-pink-50/40 transition-colors">
                          <TableCell className="px-5 py-3 align-middle font-mono text-xs text-primary">{order.order_number}</TableCell>
                          <TableCell className="px-5 py-3 align-middle">
                            <div>
                              <p className="font-medium">{order.customer_name}</p>
                              <p className="text-sm text-muted-foreground" dir="ltr">{order.customer_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3 align-middle font-bold text-primary">
                            {order.total.toFixed(2)} ر.ي
                          </TableCell>
                          <TableCell className="px-5 py-3 align-middle text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell className="px-5 py-3 align-middle">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInvoiceEditor(order)}
                              className="gap-2 h-9 rounded-xl text-xs"
                            >
                              <Eye className="w-4 h-4" />
                              عرض/تعديل الفاتورة
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab - Uploaded PDFs */}
        <TabsContent value="files">
          <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد فواتير محفوظة</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl">
                  <Table className="table-fixed">
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow className="h-20 hover:bg-pink-50/40 transition-colors">
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">اسم الملف</TableHead>
                        <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.name}>
                          <TableCell className="px-5 py-3 align-middle font-mono text-xs text-primary">{invoice.orderNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {invoice.name}
                          </TableCell>
                          <TableCell className="px-5 py-3 align-middle">
                            {format(new Date(invoice.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                          </TableCell>
                          <TableCell className="px-5 py-3 align-middle">
                            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 w-fit">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg bg-white shadow-sm"
                                onClick={() => window.open(invoice.url, '_blank')}
                                title="فتح"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg bg-white shadow-sm"
                                onClick={() => handlePrint(invoice.url)}
                                title="طباعة"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(invoice.name)}
                                title="حذف"
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Editor Modal */}
      <InvoiceEditor
        order={selectedOrder}
        open={showInvoiceEditor}
        onClose={handleCloseInvoiceEditor}
        onUpdate={handleOrderUpdated}
      />

      {/* New Invoice Creator Modal */}
      <NewInvoiceCreator
        open={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
        onCreated={handleOrderUpdated}
      />
    </div>
  );
};

export default AdminInvoicesPage;
