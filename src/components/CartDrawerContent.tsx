import { useEffect } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useStore } from "@/store/useStore";
import { useCurrency } from "@/lib/currency";

const CartDrawerContent = () => {
  const { cart, isCartOpen, closeCart, removeFromCart, updateQuantity, getCartTotal, clearCart } = useStore();

  const navigate = useNavigate();

  const total = getCartTotal();
  const { symbol: currency } = useCurrency();

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  /* =========================================================
     LOCK PAGE WHILE CART IS OPEN
  ========================================================= */

  useEffect(() => {
    if (!isCartOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCartOpen, closeCart]);

  const handleCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  const handleBrowseProducts = () => {
    closeCart();
    navigate("/products");
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* =========================================================
          BACKDROP
      ========================================================= */}

      <button type="button" aria-label="إغلاق السلة" onClick={closeCart} className="fixed inset-0 z-[70] cursor-default bg-black/20" />

      {/* =========================================================
          CART DRAWER
      ========================================================= */}

      <aside className="fixed inset-y-0 right-0 z-[80] flex w-full flex-col border-l border-[#EDE3DF] bg-[#FFFDFC] shadow-[-14px_0_40px_rgba(48,34,30,.08)] sm:max-w-[430px]" dir="rtl">
        {/* =========================================================
            HEADER
        ========================================================= */}

        <header className="shrink-0 border-b border-[#EEE5E1] bg-[#FFFDFC] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-5 sm:pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F9EAE8]">
                <ShoppingBag className="h-[17px] w-[17px] stroke-[1.6] text-[#C96F79]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-[#403331]">سلة التسوق</h2>

                  {totalQuantity > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D4777D] px-1 text-[7px] font-semibold text-white">{totalQuantity}</span>}
                </div>

                <p className="mt-0.5 text-[7px] text-[#A0928D]">FLAMINGO BAG</p>
              </div>
            </div>

            <button type="button" onClick={closeCart} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9DEDA] bg-white text-[#6C5D59] active:bg-[#F8F2EF]">
              <X className="h-4 w-4 stroke-[1.5]" />
            </button>
          </div>
        </header>

        {/* =========================================================
            CART CONTENT
        ========================================================= */}

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">
          {cart.length === 0 ? (
            /* =====================================================
                EMPTY CART
            ===================================================== */

            <div className="flex min-h-full flex-col items-center justify-center px-6 pb-16 text-center">
              <div className="relative flex h-[76px] w-[76px] items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-[#E8D4CF]" />
                <span className="absolute inset-[8px] rounded-full bg-[#FAECE9]" />

                <ShoppingBag className="relative h-6 w-6 stroke-[1.3] text-[#C66B71]" />
              </div>

              <span className="mt-5 font-serif text-[6px] tracking-[0.25em] text-[#B86168]">FLAMINGO PARK</span>

              <h3 className="mt-2 text-[17px] font-semibold text-[#483937]">سلتك فارغة</h3>

              <p className="mt-1.5 max-w-[245px] text-[9px] leading-5 text-[#9C8C87]">اكتشف أحدث اختيارات فلامنجو وأضف القطع التي تحبها إلى سلتك.</p>

              <button type="button" onClick={handleBrowseProducts} className="mt-5 h-[43px] rounded-full bg-[#D4777D] px-7 text-[10px] font-semibold text-white active:bg-[#C96B72]">تصفح المنتجات</button>
            </div>
          ) : (
            /* =====================================================
                ITEMS
            ===================================================== */

            <div className="space-y-2.5">
              {cart.map((item, cartIndex) => {
                const variant = item.variantId ? item.product.variants?.find((candidate) => candidate.id === item.variantId) : undefined;

                const basePrice = variant?.price !== undefined ? variant.price : item.product.price;

                const discount = variant?.discount !== undefined ? variant.discount : item.product.discount;

                const itemPrice = discount ? basePrice * (1 - discount / 100) : basePrice;

                const accessoriesTotal = item.selectedAccessories ? item.selectedAccessories.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) : 0;

                const unitTotal = itemPrice + accessoriesTotal;

                const image = variant?.images?.[0] || item.product.images?.[0];

                const stock = item.product.stockQuantity;

                const maxQuantityReached = typeof stock === "number" && item.quantity >= stock;

                return (
                  <article key={`${item.product.id}-${item.variantId || "base"}-${cartIndex}`} className="relative flex gap-3 rounded-[17px] border border-[#EEE5E1] bg-white p-2.5">
                    {/* IMAGE */}

                    <div className="relative h-[110px] w-[88px] shrink-0 overflow-hidden rounded-[13px] bg-[#F4F1EF]">
                      {image ? <img src={image} alt={item.product.nameAr} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><ShoppingBag className="h-5 w-5 text-[#C9BBB6]" /></div>}

                      {!!discount && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2 py-1 text-[7px] font-semibold text-[#B75F66]">-{discount}%</span>}
                    </div>

                    {/* INFO */}

                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-2 pl-7">
                        <div className="min-w-0">
                          {item.product.brand && <p className="mb-0.5 truncate text-[7px] text-[#A39691]">{item.product.brand}</p>}

                          <h3 className="line-clamp-2 text-[10px] font-semibold leading-[1.6] text-[#433634]">{item.product.nameAr}</h3>
                        </div>
                      </div>

                      {/* OPTIONS */}

                      {(item.selectedSize || item.selectedColor) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {item.selectedSize && <span className="rounded-full bg-[#F7F2F0] px-2 py-1 text-[7px] text-[#796A66]">المقاس: {item.selectedSize}</span>}

                          {item.selectedColor && <span className="rounded-full bg-[#F7F2F0] px-2 py-1 text-[7px] text-[#796A66]">اللون: {item.selectedColor}</span>}
                        </div>
                      )}

                      {/* ACCESSORIES */}

                      {item.selectedAccessories && item.selectedAccessories.length > 0 && (
                        <p className="mt-1.5 line-clamp-1 text-[7px] text-[#9E908B]">
                          +{" "}
                          {item.selectedAccessories.map((accessory, index) => (
                            <span key={`${accessory.name_ar}-${index}`}>
                              {accessory.name_ar}
                              {accessory.quantity > 1 ? ` ×${accessory.quantity}` : ""}
                              {index < item.selectedAccessories!.length - 1 ? "، " : ""}
                            </span>
                          ))}
                        </p>
                      )}

                      {/* PRICE */}

                      <div className="mt-2 flex items-end gap-1.5">
                        <span className="text-[13px] font-semibold leading-none text-[#C65F68]">{unitTotal.toFixed(2)} {currency}</span>

                        {!!discount && <span className="text-[7px] leading-none text-[#AEA19C] line-through">{basePrice.toFixed(2)}</span>}
                      </div>

                      {/* QUANTITY */}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex h-[31px] items-center overflow-hidden rounded-[10px] border border-[#E6DDD9] bg-[#FFFDFC]">
                          <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variantId)} disabled={item.quantity <= 1} className="flex h-full w-8 items-center justify-center text-[#6A5C58] disabled:opacity-30">
                            <Minus className="h-3 w-3 stroke-[1.6]" />
                          </button>

                          <span className="flex h-full min-w-[28px] items-center justify-center border-x border-[#EEE5E1] px-1 text-[9px] font-semibold text-[#493B38]">{item.quantity}</span>

                          <button type="button" onClick={() => { if (maxQuantityReached) return; updateQuantity(item.product.id, item.quantity + 1, item.variantId); }} disabled={maxQuantityReached} className="flex h-full w-8 items-center justify-center text-[#6A5C58] disabled:opacity-30">
                            <Plus className="h-3 w-3 stroke-[1.6]" />
                          </button>
                        </div>

                        <span className="text-[7px] text-[#AA9C97]">الإجمالي: {(unitTotal * item.quantity).toFixed(2)} {currency}</span>
                      </div>
                    </div>

                    {/* REMOVE */}

                    <button type="button" onClick={() => removeFromCart(item.product.id, item.variantId)} aria-label="حذف المنتج" className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF5F3] text-[#C86A70] active:bg-[#F9E4E1]">
                      <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================
            CART FOOTER
        ========================================================= */}

        {cart.length > 0 && (
          <footer className="shrink-0 border-t border-[#EDE3DF] bg-[#FFFDFC] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:px-5 sm:pb-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[8px] text-[#9D8F89]">المجموع</p>
                <p className="mt-1 text-[7px] text-[#B0A29D]">{totalQuantity} قطعة في السلة</p>
              </div>

              <div className="text-left">
                <span className="text-[20px] font-semibold leading-none text-[#B85E66]">{total.toFixed(2)}</span>
                <span className="mr-1 text-[8px] font-medium text-[#8D7975]">{currency}</span>
              </div>
            </div>

            <button type="button" onClick={handleCheckout} className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#D4777D] text-[11px] font-semibold text-white active:bg-[#C96B72]">
              <ShoppingBag className="h-4 w-4 stroke-[1.6]" />
              إتمام الشراء
            </button>

            <div className="mt-2.5 flex items-center justify-between px-1">
              <button type="button" onClick={handleBrowseProducts} className="text-[8px] font-medium text-[#776863]">متابعة التسوق</button>

              <button type="button" onClick={clearCart} className="text-[8px] font-medium text-[#B8686D]">إفراغ السلة</button>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
};

export default CartDrawerContent;