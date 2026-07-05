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
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="المالية"
        title="إدارة الفواتير"
        description={`${invoices.length} فاتورة`}
        actions={[
          {
            label: "فاتورة جديدة",
            icon: Plus,
            onClick: () => setShowNewInvoice(true),
            variant: "primary",
          },
          {
            label: "تحديث",
            icon: Search,
            onClick: () => { 
              fetchInvoices(); 
              fetchOrders(); 
            },
            variant: "secondary",
          },
        ]}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الطلب أو اسم العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Orders and Uploaded Invoices */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="gap-2">
            <Pencil className="w-4 h-4" />
            إنشاء/تعديل الفواتير ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <FileText className="w-4 h-4" />
            الفواتير المحفوظة ({filteredInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab - Create/Edit Invoices */}
        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0">
              {isLoadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.order_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.customer_name}</p>
                              <p className="text-sm text-muted-foreground" dir="ltr">{order.customer_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-primary">
                            {order.total.toFixed(2)} {order.country === 'SA' ? 'ر.س' : 'ر.ي'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInvoiceEditor(order)}
                              className="gap-2"
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
          <Card>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">اسم الملف</TableHead>
                        <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.name}>
                          <TableCell className="font-mono">{invoice.orderNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {invoice.name}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.url, '_blank')}
                                title="فتح"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
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
