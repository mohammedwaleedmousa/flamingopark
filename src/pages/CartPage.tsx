import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { useStore } from "@/store/useStore";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal } = useStore();
  const navigate = useNavigate();
  const { data: content } = useSiteContent("cart_");
  const currency = "ر.ي";
  const total = getCartTotal();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-24">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-12 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-3xl blur-2xl" />
            <div className="relative text-center py-8 md:py-12 px-6 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-3xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/70 text-background rounded-full flex items-center justify-center mb-4 shadow-lg shadow-primary/30"
              >
                <ShoppingBag className="w-8 h-8" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-heading text-4xl md:text-5xl"
              >
                {getSiteText(content, "cart_title", "حقيبتي")}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground mt-2"
              >
                {cart.length} {cart.length === 1 ? "منتج" : "منتجات"}
              </motion.p>
            </div>
          </motion.div>

          {cart.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 space-y-6"
            >
              <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-heading text-foreground">{getSiteText(content, "cart_empty_text", "حقيبتك فارغة")}</p>
                <p className="text-sm text-muted-foreground">أضف منتجات لبدء التسوق</p>
              </div>
              <Link to="/products" className="inline-flex items-center gap-2 btn-unified px-8 py-3">
                {getSiteText(content, "cart_start_shopping", "ابدأ التسوق")}
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3">
                <AnimatePresence>
                  {cart.map((item, idx) => {
                    const variant = item.variantId && (item.product as any).variants
                      ? (item.product as any).variants.find((v: any) => v.id === item.variantId)
                      : undefined;
                    const basePrice = variant && variant.price !== undefined ? variant.price : item.product.price;
                    const discount = variant && variant.discount !== undefined ? variant.discount : item.product.discount;
                    const price = discount ? basePrice * (1 - discount / 100) : basePrice;
                    const itemTotal = price * item.quantity;

                    return (
                      <motion.div
                        key={`${item.product.id}-${item.variantId || 'base'}-${item.selectedSize || ''}`}
                        variants={itemVariants}
                        exit={itemVariants.exit}
                      >
                        <Link
                          to={`/product/${item.product.slug}`}
                          className="flex gap-4 p-4 md:p-6 border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group rounded-xl shadow-sm hover:shadow-md"
                        >
                          {/* Product Image */}
                          <div className="w-24 h-32 md:w-32 md:h-40 flex-shrink-0 bg-muted overflow-hidden rounded-lg relative">
                            {((variant && variant.images && variant.images[0]) || item.product.images?.[0]) && (
                              <img
                                src={(variant && variant.images && variant.images[0]) || item.product.images[0]}
                                alt={item.product.nameAr}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}
                            {discount && (
                              <div className="absolute top-2 right-2 bg-destructive text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {discount}%
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0 flex flex-col">
                            <p className="text-xs text-muted-foreground tracking-widest uppercase">{item.product.brand}</p>
                            <h3 className="font-heading text-base md:text-lg mt-1 line-clamp-2">{item.product.nameAr}</h3>
                            {item.selectedSize && (
                              <p className="text-xs text-muted-foreground mt-1.5">المقاس: {item.selectedSize}</p>
                            )}

                            {/* Quantity and Price Controls */}
                            <div className="mt-auto pt-4 flex items-end justify-between">
                              <div className="flex items-center gap-2 border border-border rounded-lg overflow-hidden bg-muted/30">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (item.quantity > 1) {
                                      updateQuantity(item.product.id, item.quantity - 1, item.variantId);
                                    }
                                  }}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-primary/20 transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    updateQuantity(item.product.id, item.quantity + 1, item.variantId);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-primary/20 transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="text-right space-y-1">
                                <p className="font-heading text-lg text-primary">{itemTotal.toFixed(0)} {currency}</p>
                                {discount && (
                                  <p className="text-xs text-muted-foreground line-through">{(basePrice * item.quantity).toFixed(0)}</p>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeFromCart(item.product.id, item.variantId);
                                }}
                                className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Order Summary */}
              <motion.aside
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="lg:col-span-1"
              >
                <div className="sticky top-28 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 space-y-5">
                  <h2 className="font-heading text-xl text-foreground">{getSiteText(content, "cart_summary_title", "ملخص الطلب")}</h2>

                  {/* Summary Items */}
                  <div className="space-y-3 py-4 border-y border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{getSiteText(content, "cart_subtotal_label", "المجموع الفرعي")}</span>
                      <span className="font-medium">{total.toFixed(0)} {currency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{getSiteText(content, "cart_shipping_label", "الشحن")}</span>
                      <span className="font-medium text-green-600">{getSiteText(content, "cart_shipping_value", "مجاني")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الضريبة (المتوقعة)</span>
                      <span className="font-medium">-</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between font-heading text-lg bg-gradient-to-r from-primary/10 to-transparent p-3 rounded-lg">
                    <span>{getSiteText(content, "cart_total_label", "الإجمالي")}</span>
                    <span className="text-primary">{total.toFixed(0)} {currency}</span>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={() => navigate("/checkout")}
                    className="w-full h-12 rounded-lg btn-gold text-sm font-heading tracking-wide"
                  >
                    {getSiteText(content, "cart_checkout_cta", "إتمام الطلب")}
                  </Button>

                  {/* Continue Shopping */}
                  <Link
                    to="/products"
                    className="block text-center text-sm font-medium text-muted-foreground hover:text-foreground transition py-2 border border-border/50 rounded-lg hover:border-primary/50 hover:bg-primary/5"
                  >
                    {getSiteText(content, "cart_continue_cta", "متابعة التسوق")}
                  </Link>

                  {/* Info */}
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    <p>يمكنك تطبيق رموز الخصم عند الدفع</p>
                  </div>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;