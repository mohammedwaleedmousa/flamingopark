import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InvoiceItem {
  product_name: string;
  product_id?: string;
  product_image?: string;
  quantity: number;
  price: number;
}

interface Product {
  id: string;
  name_ar: string;
  price: number;
  images: string[] | null;
}

interface NewInvoiceCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const NewInvoiceCreator = ({ open, onClose, onCreated }: NewInvoiceCreatorProps) => {
  const SINGLE_COUNTRY = 'GLOBAL';
  const [isSaving, setIsSaving] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_name: '', quantity: 1, price: 0 }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-invoice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, price, images')
        .eq('is_active', true)
        .order('name_ar');
      if (error) throw error;
      return data as Product[];
    },
    enabled: open,
  });

  const filteredProducts = products.filter(p => 
    p.name_ar.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectProduct = (product: Product, index: number) => {
    const newItems = [...items];
    newItems[index] = {
      product_name: product.name_ar,
      product_id: product.id,
      product_image: product.images?.[0] || '',
      quantity: 1,
      price: product.price,
    };
    setItems(newItems);
    setActiveItemIndex(null);
    setSearchQuery('');
  };

  const currency = 'ر.ي';

  const addItem = () => {
    setItems([...items, { product_name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + deliveryFee;

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${timestamp}-${random}`;
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDeliveryFee(0);
    setPaymentMethod('cod');
    setItems([{ product_name: '', quantity: 1, price: 0 }]);
  };

  const handleSave = async () => {
    if (!customerName || !customerPhone || !customerAddress) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع بيانات العميل',
        variant: 'destructive',
      });
      return;
    }

    if (items.some(item => !item.product_name || item.price <= 0)) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء بيانات جميع المنتجات',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const orderNumber = generateOrderNumber();
      
      const orderItems = items.map((item, index) => ({
        product_id: item.product_id || `manual-${index}`,
        product_name: item.product_name,
        product_image: item.product_image || '',
        quantity: item.quantity,
        price: item.price,
      }));

      const { error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          country: SINGLE_COUNTRY,
          items: orderItems,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method: paymentMethod,
          status: 'completed',
        });

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: `تم إنشاء الفاتورة رقم ${orderNumber}`,
      });

      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء الفاتورة',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-muted/50 flex-shrink-0">
          <DialogTitle className="text-base font-bold">إنشاء فاتورة جديدة</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">بيانات العميل</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الاسم</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="اسم العميل"
                />
              </div>
              <div>
                <Label className="text-xs">الهاتف</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 text-sm"
                  dir="ltr"
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">العنوان</Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="h-8 text-sm"
                placeholder="العنوان"
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">عند الاستلام</SelectItem>
                    <SelectItem value="transfer">تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-muted-foreground">المنتجات</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                <Plus className="w-3 h-3 ml-1" />
                إضافة
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="p-2 bg-muted/30 rounded space-y-2">
                  <div className="flex gap-2 items-center">
                    {item.product_image && (
                      <img loading="lazy" src={item.product_image} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 relative">
                      <Input
                        value={item.product_name}
                        onChange={(e) => {
                          updateItem(index, 'product_name', e.target.value);
                          setSearchQuery(e.target.value);
                          setActiveItemIndex(index);
                        }}
                        onFocus={() => setActiveItemIndex(index)}
                        className="h-7 text-xs"
                        placeholder="ابحث عن منتج أو اكتب الاسم..."
                      />
                      {/* Product dropdown */}
                      {activeItemIndex === index && searchQuery && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.slice(0, 10).map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => selectProduct(product, index)}
                                className="w-full text-right px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                              >
                                {product.images?.[0] && (
                                  <img loading="lazy" src={product.images[0]} alt="" className="w-6 h-6 object-cover rounded" />
                                )}
                                <span className="flex-1">{product.name_ar}</span>
                                <span className="text-muted-foreground">{product.price} {currency}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              لا توجد منتجات - يمكنك كتابة اسم مخصص
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="h-7 w-7 p-0 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-7 text-xs w-20"
                      min={1}
                      placeholder="كمية"
                    />
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs flex-1"
                      min={0}
                      placeholder="السعر"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Totals */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">المجموع</span>
              <span>{subtotal.toFixed(0)} {currency}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <Label className="text-muted-foreground">التوصيل</Label>
              <Input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="h-7 text-xs w-24"
                min={0}
              />
            </div>
            <div className="flex items-center justify-between font-bold text-base pt-2 border-t">
              <span>الإجمالي</span>
              <span className="text-primary">{total.toFixed(0)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-muted/50">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            حفظ الفاتورة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewInvoiceCreator;
