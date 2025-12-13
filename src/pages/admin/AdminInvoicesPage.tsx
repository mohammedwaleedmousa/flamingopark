import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, ExternalLink, Trash2, Calendar, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
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

interface InvoiceFile {
  name: string;
  created_at: string;
  url: string;
  orderNumber: string;
}

const AdminInvoicesPage = () => {
  const [invoices, setInvoices] = useState<InvoiceFile[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchQuery, dateFilter, invoices]);

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
          
          // Extract order number from filename (format: invoice-ORDERNUMBER-timestamp.pdf)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading text-foreground">إدارة الفواتير</h1>
        <Button onClick={fetchInvoices} variant="outline" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تحديث'}
        </Button>
      </div>

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
                placeholder="البحث برقم الطلب..."
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoices.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredInvoices.length}</p>
                <p className="text-sm text-muted-foreground">نتائج البحث</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد فواتير</p>
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
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(invoice.name)}
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
    </div>
  );
};

export default AdminInvoicesPage;
