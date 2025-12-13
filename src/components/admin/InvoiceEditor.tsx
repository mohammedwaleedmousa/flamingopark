import { useState, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Printer, X, Pencil } from 'lucide-react';
import Logo from '@/components/Logo';

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

interface InvoiceEditorProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const InvoiceEditor = ({ order, open, onClose, onUpdate }: InvoiceEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedOrder(null);
    }
  }, [open]);

  // Calculate totals dynamically
  const calculatedTotals = useMemo(() => {
    const currentOrder = isEditing ? editedOrder : order;
    if (!currentOrder) return { subtotal: 0, total: 0, deliveryFee: 0 };

    let subtotal = 0;
    currentOrder.items.forEach(item => {
      subtotal += item.price * item.quantity;
      if (item.selected_accessories) {
        item.selected_accessories.forEach(acc => {
          subtotal += acc.price * acc.quantity;
        });
      }
    });

    const deliveryFee = currentOrder.delivery_fee;
    const total = subtotal + deliveryFee;

    return { subtotal, total, deliveryFee };
  }, [isEditing, editedOrder, order]);

  const handleStartEdit = () => {
    if (order) {
      setEditedOrder({ 
        ...order, 
        items: order.items.map(item => ({ ...item }))
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setEditedOrder(null);
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!editedOrder) return;

    setIsSaving(true);
    try {
      const { subtotal, total } = calculatedTotals;

      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: editedOrder.customer_name,
          customer_phone: editedOrder.customer_phone,
          customer_address: editedOrder.customer_address,
          customer_notes: editedOrder.customer_notes,
          items: editedOrder.items as any,
          subtotal,
          total,
          delivery_fee: editedOrder.delivery_fee,
        })
        .eq('id', editedOrder.id);

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث بيانات الطلب بنجاح',
      });

      setIsEditing(false);
      setEditedOrder(null);
      onUpdate();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الطلب',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAndPrintPdf = async () => {
    if (!invoiceRef.current || !order) return;

    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const pdfBlob = pdf.output('blob');
      const fileName = `invoice-${order.order_number}-${Date.now()}.pdf`;
      
      await supabase.storage
        .from('invoices')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      pdf.save(`فاتورة-${order.order_number}.pdf`);

      toast({
        title: 'تم إنشاء الفاتورة',
        description: 'تم حفظ وتحميل الفاتورة بنجاح',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء الفاتورة',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printContent = invoiceRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>فاتورة ${order?.order_number}</title>
            <style>
              * { font-family: Arial, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
              body { padding: 20px; direction: rtl; background: #fff; }
            </style>
          </head>
          <body>${printContent}</body>
          <script>window.onload = function() { window.print(); }</script>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const updateItemField = (index: number, field: keyof OrderItem, value: any) => {
    if (!editedOrder) return;
    const newItems = [...editedOrder.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedOrder({ ...editedOrder, items: newItems });
  };

  const updateDeliveryFee = (value: number) => {
    if (!editedOrder) return;
    setEditedOrder({ ...editedOrder, delivery_fee: value });
  };

  const displayOrder = isEditing ? editedOrder : order;
  const currency = displayOrder?.country === 'SA' ? 'ر.س' : 'ر.ي';

  if (!displayOrder) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/50 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span className="text-lg font-bold">فاتورة #{displayOrder.order_number}</span>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    <Pencil className="w-4 h-4 ml-1" />
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 ml-1" />
                    طباعة
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleGenerateAndPrintPdf}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-1" />
                    ) : (
                      <Save className="w-4 h-4 ml-1" />
                    )}
                    PDF
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 ml-1" />
                    إلغاء
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-1" />
                    ) : (
                      <Save className="w-4 h-4 ml-1" />
                    )}
                    حفظ
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div 
            ref={invoiceRef}
            className="bg-white border border-border rounded-lg p-6 space-y-6"
          >
            {/* Invoice Header */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-primary/20">
              <div>
                <Logo size="md" />
                <p className="text-xs text-muted-foreground mt-2">فاتورة ضريبية</p>
              </div>
              <div className="text-left space-y-1">
                <p className="text-xs text-muted-foreground">رقم الطلب</p>
                <p className="font-mono font-bold text-foreground">{displayOrder.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(displayOrder.created_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Customer Info - Table Style */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground border-b pb-1">بيانات العميل</h3>
                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">الاسم</Label>
                      <Input
                        value={editedOrder?.customer_name || ''}
                        onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_name: e.target.value } : null)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">الهاتف</Label>
                      <Input
                        value={editedOrder?.customer_phone || ''}
                        onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_phone: e.target.value } : null)}
                        dir="ltr"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">الاسم:</span> <span className="font-medium">{displayOrder.customer_name}</span></p>
                    <p dir="ltr" className="text-left"><span className="text-muted-foreground float-right ml-2">الهاتف:</span>{displayOrder.customer_phone}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground border-b pb-1">عنوان التوصيل</h3>
                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">العنوان</Label>
                      <Textarea
                        value={editedOrder?.customer_address || ''}
                        onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_address: e.target.value } : null)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                      <Input
                        value={editedOrder?.customer_notes || ''}
                        onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_notes: e.target.value } : null)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{displayOrder.customer_address}</p>
                    {displayOrder.customer_notes && (
                      <p className="text-muted-foreground text-xs">{displayOrder.customer_notes}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Products Table */}
            <div>
              <h3 className="text-sm font-bold text-foreground border-b pb-1 mb-3">المنتجات</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-right py-2 px-3 font-medium">المنتج</th>
                    <th className="text-center py-2 px-3 font-medium w-20">الكمية</th>
                    <th className="text-center py-2 px-3 font-medium w-28">السعر</th>
                    <th className="text-left py-2 px-3 font-medium w-28">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {displayOrder.items.map((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const accessoriesTotal = item.selected_accessories?.reduce((sum, acc) => sum + (acc.price * acc.quantity), 0) || 0;
                    
                    return (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="w-12 h-12 object-cover rounded border"
                            />
                            <div>
                              {isEditing ? (
                                <Input
                                  value={item.product_name}
                                  onChange={(e) => updateItemField(index, 'product_name', e.target.value)}
                                  className="h-7 text-sm w-48"
                                />
                              ) : (
                                <p className="font-medium">{item.product_name}</p>
                              )}
                              {item.selected_size && (
                                <p className="text-xs text-muted-foreground">الحجم: {item.selected_size}</p>
                              )}
                              {item.selected_accessories && item.selected_accessories.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.selected_accessories.map((acc, i) => (
                                    <span key={i} className="inline-block bg-muted px-1 rounded ml-1">
                                      {acc.name_ar} ×{acc.quantity} (+{acc.price * acc.quantity})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItemField(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-7 text-sm w-16 text-center mx-auto"
                            />
                          ) : (
                            <span>{item.quantity}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.price}
                              onChange={(e) => updateItemField(index, 'price', parseFloat(e.target.value) || 0)}
                              className="h-7 text-sm w-24 text-center mx-auto"
                            />
                          ) : (
                            <span>{item.price.toFixed(2)} {currency}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left font-medium text-primary">
                          {(itemTotal + accessoriesTotal).toFixed(2)} {currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-muted/30 rounded-lg p-4 mr-auto w-72">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{calculatedTotals.subtotal.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    التوصيل {displayOrder.delivery_companies?.name && `(${displayOrder.delivery_companies.name})`}
                  </span>
                  {isEditing ? (
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editedOrder?.delivery_fee || 0}
                      onChange={(e) => updateDeliveryFee(parseFloat(e.target.value) || 0)}
                      className="h-7 text-sm w-24 text-left"
                    />
                  ) : (
                    <span className="font-medium">{calculatedTotals.deliveryFee.toFixed(2)} {currency}</span>
                  )}
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-base font-bold">
                    <span>الإجمالي</span>
                    <span className="text-primary">{calculatedTotals.total.toFixed(2)} {currency}</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground">طريقة الدفع</span>
                  <span className="font-medium">
                    {displayOrder.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceEditor;
