import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CartDrawer = () => {
  const { cart, isCartOpen, closeCart, removeFromCart, updateQuantity, getCartTotal, clearCart, country } = useStore();
  const navigate = useNavigate();
  const total = getCartTotal();
  const currency = country === 'SA' ? 'ريال' : 'ريال';

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-secondary/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-gold" />
                <h2 className="font-heading text-xl text-foreground">سلة التسوق</h2>
              </div>
              <button
                onClick={closeCart}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-body">سلتك فارغة</p>
                  <Button
                    onClick={() => {
                      closeCart();
                      navigate('/products');
                    }}
                    className="mt-6 btn-gold"
                  >
                    تصفح المنتجات
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.map((item, cartIndex) => {
                    const itemPrice = item.product.discount
                      ? item.product.price * (1 - item.product.discount / 100)
                      : item.product.price;
                    
                    // Calculate accessories total for this item
                    const accessoriesTotal = item.selectedAccessories
                      ? item.selectedAccessories.reduce((sum, acc) => sum + (acc.price * acc.quantity), 0)
                      : 0;
                    
                    const itemTotalPrice = itemPrice + accessoriesTotal;

                    return (
                      <motion.div
                        key={`${item.product.id}-${cartIndex}`}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="flex gap-4 p-4 bg-muted/50 rounded-lg"
                      >
                        <img
                          src={item.product.images[0]}
                          alt={item.product.nameAr}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h3 className="font-heading text-sm text-foreground mb-1">
                            {item.product.nameAr}
                          </h3>
                          
                          {/* Show selected size */}
                          {item.selectedSize && (
                            <p className="text-xs text-muted-foreground mb-1">
                              الحجم: {item.selectedSize}
                            </p>
                          )}
                          
                          {/* Show selected accessories */}
                          {item.selectedAccessories && item.selectedAccessories.length > 0 && (
                            <div className="text-xs text-muted-foreground mb-1">
                              <span>الملحقات: </span>
                              {item.selectedAccessories.map((acc, i) => (
                                <span key={acc.name_ar}>
                                  {acc.name_ar} (×{acc.quantity})
                                  {i < item.selectedAccessories!.length - 1 ? '، ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <p className="text-gold font-body text-sm">
                            {itemTotalPrice.toFixed(2)} {currency}
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 mt-3">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center border border-border rounded-md hover:border-gold transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-body text-sm w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center border border-border rounded-md hover:border-gold transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors self-start"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-border bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-body text-muted-foreground">المجموع</span>
                  <span className="font-heading text-xl text-gold">{total.toFixed(2)} {currency}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full btn-gold py-6 font-heading tracking-wider"
                >
                  إتمام الشراء
                </Button>
                <button
                  onClick={clearCart}
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-destructive transition-colors font-body"
                >
                  إفراغ السلة
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
