import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Printer, X, Pencil, Download } from "lucide-react";

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

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedOrder(null);
      setIsGeneratingPdf(false);
    }
  }, [open]);

  const calculatedTotals = useMemo(() => {
    const currentOrder = isEditing ? editedOrder : order;
    if (!currentOrder) return { subtotal: 0, total: 0, deliveryFee: 0 };

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
    const total = subtotal + deliveryFee;

    return { subtotal, total, deliveryFee };
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
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      if (!invoiceRef.current) {
        throw new Error("Invoice element not found");
      }

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FAF8F5",
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

      // Save locally
      pdf.save(`فاتورة-${order.order_number}.pdf`);

      // Upload to storage
      const pdfBlob = pdf.output("blob");
      const fileName = `invoice-${order.order_number}-${Date.now()}.pdf`;

      await supabase.storage.from("invoices").upload(fileName, pdfBlob, {
        contentType: "application/pdf",
        cacheControl: "3600",
      });

      toast({
        title: "تم",
        description: "تم حفظ الفاتورة بنجاح",
      });
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
  const currency = displayOrder?.country === "SA" ? "ر.س" : "ر.ي";

  if (!displayOrder) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className=" max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b bg-muted/50 flex-shrink-0">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-base font-bold">#{displayOrder.order_number}</span>
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

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={invoiceRef} className="bg-[#FAF8F5] rounded-lg p-4 space-y-4 text-sm print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h2 className="font-bold text-lg text-primary">ERMGOLD</h2>
                <p className="text-xs text-muted-foreground">فاتورة</p>
              </div>
              <div className="text-left text-xs">
                <p className="font-mono font-bold">{displayOrder.order_number}</p>
                <p className="text-muted-foreground">{new Date(displayOrder.created_at).toLocaleDateString("ar-SA")}</p>
              </div>
            </div>

            {/* Customer */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">العميل</p>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      value={editedOrder?.customer_name || ""}
                      onChange={(e) =>
                        setEditedOrder((prev) => (prev ? { ...prev, customer_name: e.target.value } : null))
                      }
                      className="h-7 text-xs"
                      placeholder="الاسم"
                    />
                    <Input
                      value={editedOrder?.customer_phone || ""}
                      onChange={(e) =>
                        setEditedOrder((prev) => (prev ? { ...prev, customer_phone: e.target.value } : null))
                      }
                      className="h-7 text-xs"
                      dir="ltr"
                      placeholder="الهاتف"
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{displayOrder.customer_name}</p>
                    <p dir="ltr" className="text-left">
                      {displayOrder.customer_phone}
                    </p>
                  </>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1">العنوان</p>
                {isEditing ? (
                  <Input
                    value={editedOrder?.customer_address || ""}
                    onChange={(e) =>
                      setEditedOrder((prev) => (prev ? { ...prev, customer_address: e.target.value } : null))
                    }
                    className="h-7 text-xs"
                  />
                ) : (
                  <p className="font-medium">{displayOrder.customer_address}</p>
                )}
              </div>
            </div>

            {/* Products */}
            <div>
              <p className="text-muted-foreground text-xs mb-2">المنتجات</p>
              <div className="space-y-2">
                {displayOrder.items.map((item, index) => {
                  const itemTotal = item.price * item.quantity;
                  const accTotal = item.selected_accessories?.reduce((s, a) => s + a.price * a.quantity, 0) || 0;

                  return (
                    <div key={index} className="flex gap-2 p-2 bg-muted/30 rounded">
                      <img src={item.product_image} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-1">
                            <Input
                              value={item.product_name}
                              onChange={(e) => updateItemField(index, "product_name", e.target.value)}
                              className="h-6 text-xs"
                            />
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemField(index, "quantity", parseInt(e.target.value) || 1)}
                                className="h-6 text-xs w-14"
                                placeholder="كمية"
                              />
                              <Input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItemField(index, "price", parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs w-20"
                                placeholder="سعر"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-xs truncate">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {item.price} {currency}
                            </p>
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <p className="font-medium text-primary text-xs flex-shrink-0">
                          {(itemTotal + accTotal).toFixed(0)} {currency}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع</span>
                <span>
                  {calculatedTotals.subtotal.toFixed(0)} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">التوصيل</span>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedOrder?.delivery_fee || 0}
                    onChange={(e) =>
                      setEditedOrder((prev) =>
                        prev ? { ...prev, delivery_fee: parseFloat(e.target.value) || 0 } : null,
                      )
                    }
                    className="h-6 text-xs w-20"
                  />
                ) : (
                  <span>
                    {calculatedTotals.deliveryFee.toFixed(0)} {currency}
                  </span>
                )}
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>الإجمالي</span>
                <span className="text-primary">
                  {calculatedTotals.total.toFixed(0)} {currency}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1">
                <span>الدفع</span>
                <span>{displayOrder.payment_method === "cod" ? "عند الاستلام" : "تحويل"}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceEditor;
