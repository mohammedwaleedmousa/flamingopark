import { useState, useRef } from 'react';
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
import { Loader2, Save, Printer, X, Pencil, Eye } from 'lucide-react';
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

  const handleStartEdit = () => {
    setEditedOrder(order ? { ...order, items: [...order.items] } : null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedOrder(null);
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!editedOrder) return;

    setIsSaving(true);
    try {
      // Recalculate totals
      let subtotal = 0;
      editedOrder.items.forEach(item => {
        subtotal += item.price * item.quantity;
        if (item.selected_accessories) {
          item.selected_accessories.forEach(acc => {
            subtotal += acc.price * acc.quantity;
          });
        }
      });
      const total = subtotal + editedOrder.delivery_fee;

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

      // Upload to storage
      const pdfBlob = pdf.output('blob');
      const fileName = `invoice-${order.order_number}-${Date.now()}.pdf`;
      
      await supabase.storage
        .from('invoices')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      // Download and print
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
              * { font-family: Arial, sans-serif; box-sizing: border-box; }
              body { margin: 0; padding: 20px; direction: rtl; }
              .invoice-container { max-width: 800px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="invoice-container">${printContent}</div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
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

  const displayOrder = isEditing ? editedOrder : order;
  const currency = displayOrder?.country === 'SA' ? 'ريال' : 'ريال';

  if (!displayOrder) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>فاتورة الطلب #{displayOrder.order_number}</span>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    <Pencil className="w-4 h-4 ml-2" />
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 ml-2" />
                    طباعة
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleGenerateAndPrintPdf}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    حفظ PDF
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 ml-2" />
                    إلغاء
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    حفظ التعديلات
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Invoice Preview/Editor */}
        <div 
          ref={invoiceRef}
          className="bg-white border-2 border-gold rounded-lg p-6"
        >
          {/* Invoice Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <Logo size="md" />
              <p className="text-sm text-gray-500 mt-1">فاتورة طلب</p>
            </div>
            <div className="text-left">
              <span className="font-mono text-sm text-gray-900">{displayOrder.order_number}</span>
              <p className="text-xs text-gray-500">
                {new Date(displayOrder.created_at).toLocaleDateString('ar-SA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">معلومات العميل</h3>
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">الاسم</Label>
                    <Input
                      value={editedOrder?.customer_name || ''}
                      onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">الهاتف</Label>
                    <Input
                      value={editedOrder?.customer_phone || ''}
                      onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_phone: e.target.value } : null)}
                      dir="ltr"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-900">{displayOrder.customer_name}</p>
                  <p className="text-gray-900 font-mono text-sm" dir="ltr">{displayOrder.customer_phone}</p>
                </>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">عنوان التوصيل</h3>
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">العنوان</Label>
                    <Textarea
                      value={editedOrder?.customer_address || ''}
                      onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_address: e.target.value } : null)}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ملاحظات</Label>
                    <Input
                      value={editedOrder?.customer_notes || ''}
                      onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_notes: e.target.value } : null)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-900">{displayOrder.customer_address}</p>
                  {displayOrder.customer_notes && (
                    <p className="text-gray-500 text-sm mt-1">{displayOrder.customer_notes}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">المنتجات</h3>
            <div className="space-y-3">
              {displayOrder.items.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-4">
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">اسم المنتج</Label>
                            <Input
                              value={item.product_name}
                              onChange={(e) => updateItemField(index, 'product_name', e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">الكمية</Label>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateItemField(index, 'quantity', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">السعر</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.price}
                                onChange={(e) => updateItemField(index, 'price', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                          {item.selected_size && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">الحجم:</span> {item.selected_size}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            {item.quantity} × {item.price.toFixed(2)} {currency}
                          </p>
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <span className="font-medium text-amber-600">
                        {(item.price * item.quantity).toFixed(2)} {currency}
                      </span>
                    )}
                  </div>

                  {/* Accessories */}
                  {item.selected_accessories && item.selected_accessories.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">الملحقات:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.selected_accessories.map((acc, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200"
                          >
                            {acc.image_url && (
                              <img
                                src={acc.image_url}
                                alt={acc.name_ar}
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                            <div className="text-xs">
                              <span className="text-gray-700">{acc.name_ar}</span>
                              <span className="text-gray-500 mx-1">×{acc.quantity}</span>
                              <span className="text-amber-600">+{(acc.price * acc.quantity).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span className="text-gray-900">{displayOrder.subtotal.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                رسوم التوصيل {displayOrder.delivery_companies?.name ? `(${displayOrder.delivery_companies.name})` : ''}
              </span>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editedOrder?.delivery_fee || 0}
                  onChange={(e) => setEditedOrder(prev => prev ? { ...prev, delivery_fee: parseFloat(e.target.value) || 0 } : null)}
                  className="w-24 h-7 text-sm"
                />
              ) : (
                <span className="text-gray-900">{displayOrder.delivery_fee.toFixed(2)} {currency}</span>
              )}
            </div>
            <div className="h-px bg-gray-200 my-2" />
            <div className="flex justify-between font-medium text-lg">
              <span className="text-gray-900">الإجمالي</span>
              <span className="text-amber-600">{displayOrder.total.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between text-sm pt-2">
              <span className="text-gray-500">طريقة الدفع</span>
              <span className="text-gray-900">
                {displayOrder.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceEditor;
