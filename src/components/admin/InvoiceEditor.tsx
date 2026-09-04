import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CURRENCY_RATES, getRateSnapshot } from "@/lib/currency";
import { CheckCircle2, CircleOff, Download, FileClock, FileText, Loader2, Package, Pencil, Plus, Printer, ReceiptText, RotateCcw, Save, Trash2, UserRound, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  selected_color?: string | null;
  selected_accessories?: SelectedAccessory[];
}

type InvoiceReviewStatus = "unreviewed" | "pending" | "accepted" | "rejected" | "returned";

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
  status?: string;
  coupon_code?: string | null;
  discount_amount?: number | null;
  currency_code?: string | null;
  currency_mode?: string | null;
  exchange_rate_snapshot?: number | null;
  total_base?: number | null;
  invoice_url?: string | null;
  invoice_review_status?: InvoiceReviewStatus;
  invoice_reviewed_at?: string | null;
  invoice_reviewed_by?: string | null;
  invoice_review_note?: string | null;
  delivery_companies?: { name: string } | null;
}

interface InvoiceEditorProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const InvoiceEditor = ({ order, open, onClose, onUpdate }: InvoiceEditorProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedOrder(null);
      setIsGeneratingPdf(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && order && !isEditing) {
      setEditedOrder(null);
    }
  }, [open, order, isEditing]);

  const displayOrder = isEditing ? editedOrder : order;

  const currencyMode = displayOrder?.currency_mode || displayOrder?.currency_code || "SAR";
  const currencyMeta = CURRENCY_RATES[currencyMode] || CURRENCY_RATES.SAR;
  const rateSnapshot = Number(displayOrder?.exchange_rate_snapshot || getRateSnapshot(currencyMode) || currencyMeta?.rate || 1);
  const currencySymbol = currencyMeta?.symbol || currencyMode;

  // Orders store invoice-facing amounts in their selected native currency.
  const toDisplay = (nativeValue: number) => Number(nativeValue || 0);

  const toBase = (displayValue: number) => {
    const value = Number(displayValue || 0);
    return rateSnapshot > 0 ? value / rateSnapshot : value;
  };

  const calculatedTotals = useMemo(() => {
    const current = isEditing ? editedOrder : order;

    if (!current) return { subtotal: 0, deliveryFee: 0, discountAmount: 0, total: 0 };

    let subtotal = 0;

    current.items.forEach((item) => {
      subtotal += Number(item.price || 0) * Math.max(1, Number(item.quantity || 1));
    });

    const deliveryFee = Number(current.delivery_fee || 0);
    const discountAmount = Number(current.discount_amount || 0);
    const total = Math.max(0, subtotal + deliveryFee - discountAmount);

    return { subtotal, deliveryFee, discountAmount, total };
  }, [isEditing, editedOrder, order]);

  const reviewStatus = (order?.invoice_review_status || (order?.invoice_url ? "pending" : "unreviewed")) as InvoiceReviewStatus;

  const handleStartEdit = () => {
    if (!order) return;

    setEditedOrder({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        selected_accessories: item.selected_accessories?.map((accessory) => ({ ...accessory })) || [],
      })),
    });

    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedOrder(null);
    setIsEditing(false);
  };

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    setEditedOrder((current) => {
      if (!current) return current;

      const items = [...current.items];
      items[index] = { ...items[index], ...patch };

      return { ...current, items };
    });
  };

  const removeItem = (index: number) => {
    setEditedOrder((current) => {
      if (!current) return current;

      const items = current.items.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...current,
        items: items.length > 0 ? items : [{ product_id: `manual-${Date.now()}`, product_name: "بند جديد", product_image: "", quantity: 1, price: 0 }],
      };
    });
  };

  const addManualItem = () => {
    setEditedOrder((current) => {
      if (!current) return current;

      return {
        ...current,
        items: [
          ...current.items,
          {
            product_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            product_name: "بند جديد",
            product_image: "",
            quantity: 1,
            price: 0,
          },
        ],
      };
    });
  };

  const validateEditedOrder = () => {
    if (!editedOrder) return "لا توجد بيانات للتعديل.";
    if (!editedOrder.customer_name.trim()) return "اسم العميل مطلوب.";
    if (!editedOrder.customer_phone.trim()) return "رقم الهاتف مطلوب.";
    if (!editedOrder.customer_address.trim()) return "عنوان العميل مطلوب.";
    if (editedOrder.items.some((item) => !item.product_name.trim() || item.quantity < 1 || item.price < 0)) return "راجع بيانات بنود الفاتورة.";
    if (editedOrder.delivery_fee < 0) return "رسوم التوصيل لا يمكن أن تكون سالبة.";
    if (Number(editedOrder.discount_amount || 0) < 0) return "الخصم لا يمكن أن يكون سالبًا.";
    if (Number(editedOrder.discount_amount || 0) > calculatedTotals.subtotal + Number(editedOrder.delivery_fee || 0)) return "الخصم أكبر من قيمة الفاتورة.";

    return null;
  };

  const handleSaveChanges = async () => {
    if (!editedOrder) return;

    const validationError = validateEditedOrder();

    if (validationError) {
      toast({ title: "راجع الفاتورة", description: validationError, variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const shouldReturnToReview = Boolean(order?.invoice_url);

      const payload = {
        customer_name: editedOrder.customer_name.trim(),
        customer_phone: editedOrder.customer_phone.trim(),
        customer_address: editedOrder.customer_address.trim(),
        customer_notes: editedOrder.customer_notes?.trim() || null,
        items: editedOrder.items as any,
        subtotal: calculatedTotals.subtotal,
        delivery_fee: Number(editedOrder.delivery_fee || 0),
        discount_amount: Number(editedOrder.discount_amount || 0),
        total: calculatedTotals.total,
        total_base: toBase(calculatedTotals.total),
        invoice_review_status: shouldReturnToReview ? "pending" : "unreviewed",
        invoice_reviewed_at: null,
        invoice_reviewed_by: null,
        invoice_review_note: null,
      };

      const { error } = await supabase.from("orders").update(payload).eq("id", editedOrder.id);

      if (error) throw error;

      toast({
        title: "تم حفظ تعديلات الفاتورة",
        description: shouldReturnToReview ? "بسبب تعديل الفاتورة تم إعادتها تلقائيًا إلى بانتظار المراجعة." : "تم تحديث بيانات الفاتورة.",
      });

      setIsEditing(false);
      setEditedOrder(null);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "تعذر حفظ التعديلات",
        description: error?.message || "حدث خطأ أثناء تحديث الفاتورة.",
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
    if (!order || !invoiceRef.current || isEditing) return;

    setIsGeneratingPdf(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

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
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`فاتورة-${order.order_number}.pdf`);

      const pdfBlob = pdf.output("blob");
      const fileName = `invoice-${order.order_number}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage.from("invoices").upload(fileName, pdfBlob, {
        contentType: "application/pdf",
        cacheControl: "3600",
      });

      if (uploadError) throw uploadError;

      const oldInvoiceFile = order.invoice_url || null;

      const { error: linkError } = await supabase.from("orders").update({
        invoice_url: fileName,
        invoice_review_status: "pending",
        invoice_reviewed_at: null,
        invoice_reviewed_by: null,
        invoice_review_note: null,
      }).eq("id", order.id);

      if (linkError) {
        await supabase.storage.from("invoices").remove([fileName]);
        throw linkError;
      }

      if (oldInvoiceFile && oldInvoiceFile !== fileName) {
        const { error: removeOldError } = await supabase.storage.from("invoices").remove([oldInvoiceFile]);

        if (removeOldError) {
          console.warn("Could not remove old invoice file:", removeOldError);
        }
      }

      toast({
        title: "تم إنشاء PDF",
        description: "تم حفظ الفاتورة وإرسالها تلقائيًا إلى قسم بانتظار المراجعة.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "تعذر إنشاء PDF",
        description: error?.message || "حدث خطأ أثناء إنشاء الفاتورة.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!displayOrder) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isSaving && !isGeneratingPdf) onClose(); }}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] w-[97vw] max-w-[1120px] flex-col overflow-hidden rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
        <DialogHeader className="shrink-0 border-b border-[#E6E9EE] bg-white px-5 py-4">
          <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]"><ReceiptText className="h-[16px] w-[16px]" /></div>
              <div>
                <DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">فاتورة #{displayOrder.order_number}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">راجع البيانات، عدّل البنود عند الحاجة، ثم احفظ PDF ليتم إرسال الفاتورة إلى المراجعة.</DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-[6px]">
              <ReviewStatus status={reviewStatus} />

              {!isEditing ? (
                <>
                  <Button type="button" variant="outline" onClick={handleStartEdit} className="h-[36px] rounded-[9px] border-[#E2DEF3] bg-white px-3 text-[10px] font-semibold text-[#675CBA] shadow-none"><Pencil className="ml-[5px] h-[11px] w-[11px]" />تعديل</Button>
                  <Button type="button" variant="outline" onClick={handlePrint} className="h-[36px] rounded-[9px] border-[#E3E7EC] bg-white px-3 text-[10px] font-semibold text-[#68717B] shadow-none"><Printer className="ml-[5px] h-[11px] w-[11px]" />طباعة</Button>
                  <Button type="button" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="h-[36px] rounded-[9px] bg-[#675CBA] px-3 text-[10px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{isGeneratingPdf ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <Download className="ml-[5px] h-[11px] w-[11px]" />}{order.invoice_url ? "تحديث PDF" : "حفظ PDF"}</Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving} className="h-[36px] rounded-[9px] border-[#E3E7EC] bg-white px-3 text-[10px] font-semibold text-[#68717B] shadow-none"><X className="ml-[5px] h-[11px] w-[11px]" />إلغاء التعديل</Button>
                  <Button type="button" onClick={handleSaveChanges} disabled={isSaving} className="h-[36px] rounded-[9px] bg-[#675CBA] px-3 text-[10px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{isSaving ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <Save className="ml-[5px] h-[11px] w-[11px]" />}حفظ التعديلات</Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-[10px]">
          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1fr)_270px]">
            <div className="overflow-x-auto">
              <div ref={invoiceRef} id="admin-invoice" className="mx-auto min-w-[690px] max-w-[820px] rounded-[12px] border border-[#E4E8ED] bg-white p-[28px] text-[#303741] shadow-[0_2px_10px_rgba(31,41,55,0.04)]">
                <div className="flex items-start justify-between gap-6 border-b border-[#E8EBEF] pb-5">
                  <div>
                    <img src={flamingoLogo} alt="Flamingo" className="h-[58px] w-auto object-contain" />
                    <p className="mt-2 text-[11px] font-semibold text-[#4C545E]">فاتورة مبيعات</p>
                    <p className="mt-1 text-[9px] text-[#9198A1]">Flamingo Park</p>
                  </div>

                  <div className="text-left">
                    <p className="font-mono text-[13px] font-semibold text-[#675CBA]">{displayOrder.order_number}</p>
                    <p className="mt-1 text-[9px] text-[#8D949E]">{formatDateTime(displayOrder.created_at)}</p>
                    <p className="mt-1 text-[9px] text-[#8D949E]">{paymentLabel(displayOrder.payment_method)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-7 border-b border-[#E8EBEF] py-5">
                  <div>
                    <p className="mb-2 text-[9px] font-semibold text-[#9AA1AB]">بيانات العميل</p>

                    {isEditing ? (
                      <div className="space-y-[6px]">
                        <Input value={editedOrder?.customer_name || ""} onChange={(event) => setEditedOrder((current) => current ? { ...current, customer_name: event.target.value } : current)} className="h-[36px] rounded-[8px] border-[#E2E6EB] text-[10px] shadow-none focus-visible:ring-0" />
                        <Input value={editedOrder?.customer_phone || ""} onChange={(event) => setEditedOrder((current) => current ? { ...current, customer_phone: event.target.value } : current)} dir="ltr" className="h-[36px] rounded-[8px] border-[#E2E6EB] text-[10px] shadow-none focus-visible:ring-0" />
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] font-semibold">{displayOrder.customer_name}</p>
                        <p dir="ltr" className="mt-1 text-right text-[10px] text-[#727A84]">{displayOrder.customer_phone}</p>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-[9px] font-semibold text-[#9AA1AB]">عنوان التوصيل</p>

                    {isEditing ? (
                      <div className="space-y-[6px]">
                        <Input value={editedOrder?.customer_address || ""} onChange={(event) => setEditedOrder((current) => current ? { ...current, customer_address: event.target.value } : current)} className="h-[36px] rounded-[8px] border-[#E2E6EB] text-[10px] shadow-none focus-visible:ring-0" />
                        <Textarea rows={2} value={editedOrder?.customer_notes || ""} onChange={(event) => setEditedOrder((current) => current ? { ...current, customer_notes: event.target.value } : current)} placeholder="ملاحظات العميل" className="resize-none rounded-[8px] border-[#E2E6EB] text-[10px] shadow-none focus-visible:ring-0" />
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] leading-6 text-[#59616B]">{displayOrder.customer_address}</p>
                        {displayOrder.customer_notes && <p className="mt-1 text-[9px] leading-5 text-[#9299A3]">ملاحظات: {displayOrder.customer_notes}</p>}
                      </>
                    )}
                  </div>
                </div>

                <div className="py-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#535B65]">بنود الفاتورة</p>
                    {isEditing && <button type="button" onClick={addManualItem} className="flex h-[30px] items-center gap-[5px] rounded-[7px] border border-[#E2DEF3] bg-white px-[8px] text-[9px] font-semibold text-[#675CBA]"><Plus className="h-[9px] w-[9px]" />إضافة بند</button>}
                  </div>

                  <div className="overflow-hidden rounded-[9px] border border-[#E7EAEF]">
                    <div className="grid grid-cols-[minmax(0,1fr)_90px_120px_130px] bg-[#F8FAFC] px-[10px] py-[8px] text-[9px] font-semibold text-[#858D97]">
                      <span>المنتج</span>
                      <span>الكمية</span>
                      <span>السعر</span>
                      <span>الإجمالي</span>
                    </div>

                    <div>
                      {displayOrder.items.map((item, index) => (
                        <div key={`${item.product_id}-${index}`} className="grid grid-cols-[minmax(0,1fr)_90px_120px_130px] items-center border-t border-[#EDF0F3] px-[10px] py-[9px]">
                          <div className="flex min-w-0 items-center gap-[8px]">
                            <div className="flex h-[42px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-[#F3F5F7]">
                              {item.product_image ? <img src={item.product_image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-[12px] w-[12px] text-[#A0A6AF]" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-[5px]">
                                  <Input value={item.product_name} onChange={(event) => updateItem(index, { product_name: event.target.value })} className="h-[32px] rounded-[7px] border-[#E2E6EB] text-[9px] shadow-none focus-visible:ring-0" />
                                  <button type="button" onClick={() => removeItem(index)} className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] text-[#C15F56] hover:bg-[#FFF0ED]"><Trash2 className="h-[9px] w-[9px]" /></button>
                                </div>
                              ) : (
                                <>
                                  <p className="truncate text-[10px] font-semibold text-[#4E5660]">{item.product_name}</p>
                                  {(item.selected_size || item.selected_color) && <p className="mt-[3px] text-[8px] text-[#979EA7]">{item.selected_size ? `المقاس: ${item.selected_size}` : ""}{item.selected_size && item.selected_color ? " · " : ""}{item.selected_color ? `اللون: ${item.selected_color}` : ""}</p>}
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            {isEditing ? <Input type="number" min={1} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })} className="h-[32px] w-[68px] rounded-[7px] border-[#E2E6EB] text-[9px] shadow-none focus-visible:ring-0" /> : <span className="text-[10px] text-[#68717B]">{item.quantity}</span>}
                          </div>

                          <div>
                            {isEditing ? <Input type="number" min={0} step={currencyMode === "SAR" ? "0.01" : "1"} value={Number(toDisplay(item.price).toFixed(currencyMode === "SAR" ? 2 : 0))} onChange={(event) => updateItem(index, { price: Math.max(0, toBase(Number(event.target.value) || 0)) })} className="h-[32px] w-[100px] rounded-[7px] border-[#E2E6EB] text-[9px] shadow-none focus-visible:ring-0" /> : <span className="text-[10px] text-[#68717B]">{toDisplay(item.price).toLocaleString("en-US")} {currencySymbol}</span>}
                          </div>

                          <span className="text-[10px] font-semibold text-[#59616B]">{toDisplay(item.price * item.quantity).toLocaleString("en-US")} {currencySymbol}</span>

                          {item.selected_accessories && item.selected_accessories.length > 0 && (
                            <div className="col-span-4 mt-[7px] rounded-[7px] bg-[#FAFBFC] px-[8px] py-[6px]">
                              <p className="text-[8px] font-semibold text-[#8C949E]">الملحقات</p>
                              <div className="mt-[4px] flex flex-wrap gap-[4px]">
                                {item.selected_accessories.map((accessory, accessoryIndex) => <span key={`${accessory.name}-${accessoryIndex}`} className="rounded-[5px] bg-white px-[6px] py-[3px] text-[8px] text-[#707883] ring-1 ring-[#E5E9EF]">{accessory.name_ar || accessory.name} × {accessory.quantity} — {toDisplay(accessory.price * accessory.quantity).toLocaleString("en-US")} {currencySymbol}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_290px] gap-8 border-t border-[#E8EBEF] pt-5">
                  <div>
                    {displayOrder.delivery_companies?.name && <p className="text-[9px] text-[#8D949E]">شركة التوصيل: <span className="font-semibold text-[#59616B]">{displayOrder.delivery_companies.name}</span></p>}
                    {displayOrder.coupon_code && <p className="mt-2 text-[9px] text-[#8D949E]">مرجع الخصم: <span className="font-semibold text-[#59616B]">{displayOrder.coupon_code}</span></p>}
                    <p className="mt-2 text-[9px] text-[#8D949E]">العملة: <span className="font-semibold text-[#59616B]">{currencyMeta?.label || currencyMode}</span></p>
                  </div>

                  <div className="space-y-[7px]">
                    <InvoiceTotalRow label="المجموع" value={`${toDisplay(calculatedTotals.subtotal).toLocaleString("en-US")} ${currencySymbol}`} />

                    {isEditing ? (
                      <div className="flex items-center justify-between gap-[10px]">
                        <span className="text-[9px] text-[#858D97]">التوصيل</span>
                        <Input type="number" min={0} value={Number(toDisplay(editedOrder?.delivery_fee || 0).toFixed(currencyMode === "SAR" ? 2 : 0))} onChange={(event) => setEditedOrder((current) => current ? { ...current, delivery_fee: Math.max(0, toBase(Number(event.target.value) || 0)) } : current)} className="h-[32px] w-[120px] rounded-[7px] border-[#E2E6EB] text-[9px] shadow-none focus-visible:ring-0" />
                      </div>
                    ) : (
                      <InvoiceTotalRow label="التوصيل" value={`${toDisplay(calculatedTotals.deliveryFee).toLocaleString("en-US")} ${currencySymbol}`} />
                    )}

                    {isEditing ? (
                      <div className="flex items-center justify-between gap-[10px]">
                        <span className="text-[9px] text-[#858D97]">الخصم</span>
                        <Input type="number" min={0} value={Number(toDisplay(editedOrder?.discount_amount || 0).toFixed(currencyMode === "SAR" ? 2 : 0))} onChange={(event) => setEditedOrder((current) => current ? { ...current, discount_amount: Math.max(0, toBase(Number(event.target.value) || 0)) } : current)} className="h-[32px] w-[120px] rounded-[7px] border-[#E2E6EB] text-[9px] shadow-none focus-visible:ring-0" />
                      </div>
                    ) : (
                      <InvoiceTotalRow label="الخصم" value={`- ${toDisplay(calculatedTotals.discountAmount).toLocaleString("en-US")} ${currencySymbol}`} negative={calculatedTotals.discountAmount > 0} />
                    )}

                    <div className="border-t border-[#E7EAEF] pt-[8px]">
                      <div className="flex items-end justify-between gap-[10px]">
                        <span className="text-[10px] font-semibold text-[#4A525C]">الإجمالي</span>
                        <span className="text-[17px] font-semibold text-[#675CBA]">{toDisplay(calculatedTotals.total).toLocaleString("en-US")} <span className="text-[10px]">{currencySymbol}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E8EBEF] pt-4 text-center">
                  <p className="text-[8px] text-[#9BA2AC]">شكرًا لاختياركم Flamingo Park</p>
                </div>
              </div>
            </div>

            <aside className="space-y-[10px] xl:sticky xl:top-0 xl:self-start">
              <SideCard title="حالة الفاتورة" icon={FileText}>
                <div className="flex items-center justify-between gap-[8px]">
                  <span className="text-[9px] text-[#8D949E]">حالة المراجعة</span>
                  <ReviewStatus status={reviewStatus} />
                </div>

                <div className="mt-[8px] flex items-center justify-between gap-[8px]">
                  <span className="text-[9px] text-[#8D949E]">ملف PDF</span>
                  <span className={cn("rounded-[7px] border px-[7px] py-[4px] text-[9px] font-semibold", order?.invoice_url ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}>{order?.invoice_url ? "محفوظ" : "غير منشأ"}</span>
                </div>

                {order?.invoice_review_note && (
                  <div className="mt-[9px] rounded-[8px] border border-[#F0D7D4] bg-[#FFF8F7] p-[8px]">
                    <p className="text-[8px] font-semibold text-[#B16059]">ملاحظة المراجعة</p>
                    <p className="mt-[4px] text-[9px] leading-5 text-[#9A6863]">{order.invoice_review_note}</p>
                  </div>
                )}
              </SideCard>

              <SideCard title="دورة العمل" icon={RotateCcw}>
                <div className="space-y-[7px]">
                  <WorkflowStep done={Boolean(order?.invoice_url)} label="إنشاء وحفظ PDF" />
                  <WorkflowStep done={reviewStatus === "pending" || reviewStatus === "accepted" || reviewStatus === "rejected"} label="إرسال للمراجعة" />
                  <WorkflowStep done={reviewStatus === "accepted"} label="اعتماد الفاتورة" />
                </div>

                <p className="mt-[9px] text-[9px] leading-5 text-[#8D949E]">أي تعديل على فاتورة محفوظة يعيدها تلقائيًا إلى <strong>بانتظار المراجعة</strong>.</p>
              </SideCard>

              <SideCard title="ملخص" icon={ReceiptText}>
                <InvoiceTotalRow label="عدد البنود" value={`${displayOrder.items.length}`} />
                <InvoiceTotalRow label="عدد القطع" value={`${displayOrder.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}`} />
                <InvoiceTotalRow label="الإجمالي" value={`${toDisplay(calculatedTotals.total).toLocaleString("en-US")} ${currencySymbol}`} />
              </SideCard>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "—";
  }
};

const paymentLabel = (method: string) => {
  const value = String(method || "").toLowerCase();

  if (value === "cod") return "الدفع عند الاستلام";
  if (value === "cash") return "نقدًا";
  if (value === "transfer" || value === "bank_transfer") return "تحويل بنكي";
  if (value === "card") return "بطاقة";

  return method || "غير محدد";
};

const ReviewStatus = ({ status }: { status: InvoiceReviewStatus }) => {
  if (status === "accepted") return <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[8px] text-[9px] font-semibold text-[#568468]"><CheckCircle2 className="h-[9px] w-[9px]" />مقبولة</span>;
  if (status === "rejected") return <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#F0D7D4] bg-[#FFF3F1] px-[8px] text-[9px] font-semibold text-[#C15F56]"><CircleOff className="h-[9px] w-[9px]" />مرفوضة</span>;
  if (status === "pending") return <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#EEDFC4] bg-[#FFF7E8] px-[8px] text-[9px] font-semibold text-[#A9782F]"><FileClock className="h-[9px] w-[9px]" />بانتظار المراجعة</span>;
  return <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#E3E6EA] bg-[#F5F6F8] px-[8px] text-[9px] font-semibold text-[#818994]"><ReceiptText className="h-[9px] w-[9px]" />غير منشأة</span>;
};

const SideCard = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]"><div className="mb-[9px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[27px] w-[27px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[10px] w-[10px]" /></div><h3 className="text-[10px] font-semibold text-[#4A525C]">{title}</h3></div>{children}</section>;
};

const WorkflowStep = ({ done, label }: { done: boolean; label: string }) => {
  return <div className="flex items-center gap-[7px]"><span className={cn("flex h-[20px] w-[20px] items-center justify-center rounded-full", done ? "bg-[#EAF7EE] text-[#568468]" : "bg-[#F1F3F6] text-[#9AA1AB]")}>{done ? <CheckCircle2 className="h-[9px] w-[9px]" /> : <CircleOff className="h-[9px] w-[9px]" />}</span><span className={cn("text-[9px] font-medium", done ? "text-[#59616B]" : "text-[#969DA7]")}>{label}</span></div>;
};

const InvoiceTotalRow = ({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) => {
  return <div className="flex items-center justify-between gap-[10px]"><span className="text-[9px] text-[#858D97]">{label}</span><span className={cn("text-[10px] font-semibold", negative ? "text-[#C15F56]" : "text-[#59616B]")}>{value}</span></div>;
};

export default InvoiceEditor;
