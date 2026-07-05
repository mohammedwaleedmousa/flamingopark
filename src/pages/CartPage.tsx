import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { useStore } from "@/store/useStore";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, country } = useStore();
  const navigate = useNavigate();
  const { data: content } = useSiteContent("cart_");
  const currency = country === "SA" ? "ر.س" : "ر.ي";
  const total = getCartTotal();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="font-heading text-4xl md:text-5xl">{getSiteText(content, "cart_title", "حقيبتي")}</h1>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-20 space-y-6">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-blakc">{getSiteText(content, "cart_empty_text", "حقيبتك فارغة")}</p>
              <Link to="/products" className="inline-flex items-center gap-2 border border-foreground px-8 py-3 text-[11px] tracking-[0.4em] uppercase hover:bg-foreground hover:text-background transition">
                {getSiteText(content, "cart_start_shopping", "ابدأ التسوق")} <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 divide-y divide-border">
                {cart.map((item) => {
                  const variant = item.variantId && (item.product as any).variants
                    ? (item.product as any).variants.find((v: any) => v.id === item.variantId)
                    : undefined;
                  const basePrice = variant && variant.price !== undefined ? variant.price : item.product.price;
                  const discount = variant && variant.discount !== undefined ? variant.discount : item.product.discount;
                  const price = discount ? basePrice * (1 - discount / 100) : basePrice;
                  return (
                    <div key={`${item.product.id}-${item.variantId || 'base'}-${item.selectedSize || ''}`} className="flex gap-4 py-6">
                      <Link to={`/product/${item.product.slug}`} className="w-24 h-32 md:w-28 md:h-36 flex-shrink-0 bg-muted overflow-hidden">
                        {((variant && variant.images && variant.images[0]) || item.product.images?.[0]) && (
                          <img src={(variant && variant.images && variant.images[0]) || item.product.images[0]} alt={item.product.nameAr} className="w-full h-full object-cover" />
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] tracking-[0.35em] uppercase text-muted-foreground">{item.product.brand}</p>
                        <Link to={`/product/${item.product.slug}`} className="font-heading text-base block mt-1 hover:opacity-60">{item.product.nameAr}</Link>
                        {item.selectedSize && <p className="text-xs text-muted-foreground mt-1">المقاس: {item.selectedSize}</p>}
                        <div className="flex items-center justify-between mt-4">
                          <div className="inline-flex items-center border border-border">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variantId)} className="w-8 h-8 flex items-center justify-center hover:bg-muted"><Minus className="w-3 h-3" /></button>
                            <span className="w-10 text-center text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variantId)} className="w-8 h-8 flex items-center justify-center hover:bg-muted"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="text-sm font-medium">{(price * item.quantity).toFixed(0)} {currency}</span>
                          <button onClick={() => removeFromCart(item.product.id, item.variantId)} className="text-muted-foreground hover:text-foreground"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <aside className="lg:col-span-1">
                <div className="bg-muted/50 p-6 sticky top-28 space-y-4">
                  <h2 className="font-heading text-xl">{getSiteText(content, "cart_summary_title", "ملخص الطلب")}</h2>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">{getSiteText(content, "cart_subtotal_label", "المجموع الفرعي")}</span><span>{total.toFixed(0)} {currency}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">{getSiteText(content, "cart_shipping_label", "الشحن")}</span><span>{getSiteText(content, "cart_shipping_value", "يُحسب لاحقاً")}</span></div>
                  <div className="border-t border-border pt-4 flex justify-between font-heading text-lg"><span>{getSiteText(content, "cart_total_label", "الإجمالي")}</span><span>{total.toFixed(0)} {currency}</span></div>
                  <Button onClick={() => navigate("/checkout")} className="w-full h-12 rounded-none bg-foreground text-background hover:bg-foreground/90 text-[11px] tracking-[0.4em] uppercase">{getSiteText(content, "cart_checkout_cta", "إتمام الطلب")}</Button>
                  <Link to="/products" className="block text-center text-[11px] tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground">{getSiteText(content, "cart_continue_cta", "متابعة التسوق")}</Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;