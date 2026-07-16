import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Printer, X, Pencil, Download } from "lucide-react";
import { CURRENCY_RATES, convertPrice } from "@/lib/currency";
// Use public path for static assets that live in /public
const flamingoLogo = "/icons/flamingo.jpeg";

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
  coupon_code?: string | null;
  discount_amount?: number;
  currency_code?: string | null;
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

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedOrder(null);
      setIsGeneratingPdf(false);
    }
  }, [open]);

  const calculatedTotals = useMemo(() => {
    const currentOrder = isEditing ? editedOrder : order;
    if (!currentOrder) return { subtotal: 0, total: 0, deliveryFee: 0, discountAmount: 0 };

    let subtotal = 0;
    currentOrder.items.forEach((item) => {
      subtotal += item.price * item.quantity;
      if (item.selected_accessories) {
        item.selected_accessories.forEach((acc) => {
          subtotal += acc.price * acc.quantity;
        });
      }
    });

    const deliveryFee = currentOrder.delivery_fee;
    const discountAmount = currentOrder.discount_amount || 0;
    const total = subtotal + deliveryFee - discountAmount;

    return { subtotal, total, deliveryFee, discountAmount };
  }, [isEditing, editedOrder, order]);

  const handleStartEdit = () => {
    if (order) {
      setEditedOrder({
        ...order,
        items: order.items.map((item) => ({ ...item })),
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
        .from("orders")
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
        .eq("id", editedOrder.id);

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم تحديث بيانات الطلب بنجاح",
      });

      setIsEditing(false);
      setEditedOrder(null);
      onUpdate();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الطلب",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!order) return;

    setIsGeneratingPdf(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      if (!invoiceRef.current) {
        throw new Error("Invoice element not found");
      }

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, 297));

      pdf.save(`فاتورة-${order.order_number}.pdf`);

      const pdfBlob = pdf.output("blob");
      const fileName = `invoice-${order.order_number}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage.from("invoices").upload(fileName, pdfBlob, {
        contentType: "application/pdf",
        cacheControl: "3600",
      });

      if (uploadError) throw uploadError;

      const { error: linkError } = await supabase
        .from("orders")
        .update({ invoice_url: fileName })
        .eq("id", order.id);

      if (linkError) {
        console.warn("Failed linking invoice to order:", linkError);
      }

      toast({
        title: "تم",
        description: "تم حفظ الفاتورة وربطها بالطلب",
      });

      onUpdate();
    } catch (error) {
      console.error("PDF Error:", error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الفاتورة",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const updateItemField = (index: number, field: keyof OrderItem, value: any) => {
    if (!editedOrder) return;
    const newItems = [...editedOrder.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedOrder({ ...editedOrder, items: newItems });
  };

  const displayOrder = isEditing ? editedOrder : order;
  const currencyMode = (displayOrder?.currency_code as string) || "SAR";
  const currency = CURRENCY_RATES[currencyMode]?.symbol || "ر.س";
  const fmt = (amountSAR: number) => convertPrice(amountSAR, currencyMode).toLocaleString("en-US");

  if (!displayOrder) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-background max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b bg-muted/50 flex-shrink-0">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-base font-bold">فاتورة #{displayOrder.order_number}</span>
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleStartEdit} className="h-8 px-2">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 px-2">
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="h-8 px-2">
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-8 px-2">
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveChanges} disabled={isSaving} className="h-8 px-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Invoice Content - Similar to Customer Invoice */}
        <div className="flex-1 overflow-y-auto p-4">
          <div 
            ref={invoiceRef} 
            className="bg-white border-2 border-primary rounded-lg p-6 md:p-8 space-y-6"
            id="admin-invoice"
          >
            {/* Invoice Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <img src={flamingoLogo} alt="Flamingo" className="h-16 w-auto object-contain" />
                <p className="text-sm text-gray-500 mt-1">فاتورة طلب</p>
              </div>
              <div className="text-left">
                <span className="font-mono text-sm text-gray-900 font-bold">{displayOrder.order_number}</span>
                <p className="text-xs text-gray-500">
                  {new Date(displayOrder.created_at).toLocaleDateString('ar', {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-heading text-gray-500 mb-2">معلومات العميل</h3>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editedOrder?.customer_name || ""}
                      onChange={(e) =>
                        setEditedOrder((prev) => (prev ? { ...prev, customer_name: e.target.value } : null))
                      }
                      className="text-sm"
                      placeholder="الاسم"
                    />
                    <Input
                      value={editedOrder?.customer_phone || ""}
                      onChange={(e) =>
                        setEditedOrder((prev) => (prev ? { ...prev, customer_phone: e.target.value } : null))
                      }
                      className="text-sm"
                      dir="ltr"
                      placeholder="الهاتف"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-gray-900 font-body">{displayOrder.customer_name}</p>
                    <p className="text-gray-900 font-mono text-sm" dir="ltr">{displayOrder.customer_phone}</p>
                  </>
                )}
              </div>
              <div>
                <h3 className="text-sm font-heading text-gray-500 mb-2">عنوان التوصيل</h3>
                {isEditing ? (
                  <Input
                    value={editedOrder?.customer_address || ""}
                    onChange={(e) =>
                      setEditedOrder((prev) => (prev ? { ...prev, customer_address: e.target.value } : null))
                    }
                    className="text-sm"
                  />
                ) : (
                  <p className="text-gray-900 font-body">{displayOrder.customer_address}</p>
                )}
                {displayOrder.customer_notes && (
                  <p className="text-gray-500 text-sm mt-1">ملاحظات: {displayOrder.customer_notes}</p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-sm font-heading text-gray-500 mb-4">المنتجات</h3>
              <div className="space-y-3">
                {displayOrder.items.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-4">
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded-md print:w-12 print:h-12"
                      />
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={item.product_name}
                              onChange={(e) => updateItemField(index, "product_name", e.target.value)}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemField(index, "quantity", parseInt(e.target.value) || 1)}
                                className="w-20 text-sm"
                                placeholder="كمية"
                              />
                              <Input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItemField(index, "price", parseFloat(e.target.value) || 0)}
                                className="w-28 text-sm"
                                placeholder="سعر"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-heading text-gray-900">{item.product_name}</h4>
                            {item.selected_size && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">الحجم:</span> {item.selected_size}
                              </p>
                            )}
                            <p className="text-sm text-gray-500">
                              {item.quantity} × {fmt(item.price)} {currency}
                            </p>
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <span className="font-heading text-primary">
                          {fmt(item.price * item.quantity)} {currency}
                        </span>
                      )}
                    </div>
                    
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
                                <span className="text-gray-700">{acc.name_ar || acc.name}</span>
                                <span className="text-gray-500 mx-1">×{acc.quantity}</span>
                                <span className="text-primary">+{(acc.price * acc.quantity).toFixed(0)}</span>
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
              <div className="flex justify-between text-sm font-body">
                <span className="text-gray-500">المجموع الفرعي</span>
                <span className="text-gray-900">{fmt(calculatedTotals.subtotal)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-gray-500">رسوم التوصيل</span>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedOrder?.delivery_fee || 0}
                    onChange={(e) =>
                      setEditedOrder((prev) =>
                        prev ? { ...prev, delivery_fee: parseFloat(e.target.value) || 0 } : null,
                      )
                    }
                    className="w-24 text-sm"
                  />
                ) : (
                  <span className="text-gray-900">{fmt(calculatedTotals.deliveryFee)} {currency}</span>
                )}
              </div>
              {calculatedTotals.discountAmount > 0 && (
                <div className="flex justify-between text-sm font-body text-green-600">
                  <span>
                    الخصم {displayOrder.coupon_code && (
                      <span className="font-mono bg-green-100 px-1.5 py-0.5 rounded text-xs mr-1">
                        {displayOrder.coupon_code}
                      </span>
                    )}
                  </span>
                  <span>-{fmt(calculatedTotals.discountAmount)} {currency}</span>
                </div>
              )}
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between font-heading text-lg">
                <span className="text-gray-900">الإجمالي</span>
                <span className="text-primary">{fmt(calculatedTotals.total)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm font-body pt-2">
                <span className="text-gray-500">طريقة الدفع</span>
                <span className="text-gray-900">
                  {displayOrder.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceEditor;