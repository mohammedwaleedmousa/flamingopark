import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Tag, Trash2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { useStore } from "@/store/useStore";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";
import { useCurrency } from "@/lib/currency";

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal } = useStore();
  const navigate = useNavigate();
  const { data: content } = useSiteContent("cart_");

  const { format: formatCurrency, symbol: currency } = useCurrency();
  const total = getCartTotal();

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        {/* =========================================================
            HEADER
        ========================================================= */}
        <section className="border-b border-[#F0E6E2] bg-[#FFF8F6]">
          <div className="mx-auto flex w-full max-w-[1200px] items-end justify-between gap-5 px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                <span className="font-serif text-[7px] tracking-[0.24em] text-[#B86168]">FLAMINGO BAG</span>
              </div>

              <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-[#403131] md:text-[36px]">{getSiteText(content, "cart_title", "حقيبتي")}</h1>

              <p className="mt-1.5 text-[8px] text-[#9B8984] md:text-[10px]">{totalQuantity > 0 ? `${totalQuantity} ${totalQuantity === 1 ? "قطعة" : "قطع"} في السلة` : "اختياراتك ستظهر هنا"}</p>
            </div>

            {cart.length > 0 && (
              <div className="shrink-0 text-left">
                <span className="block text-[18px] font-semibold leading-none text-[#B85F66] md:text-[22px]">{total.toFixed(0)}</span>
                <span className="mt-1 block text-[6px] text-[#A99A94] md:text-[7px]">{currency}</span>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            EMPTY
        ========================================================= */}
        {cart.length === 0 ? (
          <section className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-6 text-center">
            <div className="relative flex h-[78px] w-[78px] items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-[#E8D4CF]" />
              <span className="absolute inset-[8px] rounded-full bg-[#FAECE9]" />
              <ShoppingBag className="relative h-6 w-6 stroke-[1.3] text-[#C76D73]" />
            </div>

            <span className="mt-5 font-serif text-[6px] tracking-[0.25em] text-[#B86168]">FLAMINGO PARK</span>

            <h2 className="mt-2 text-[18px] font-semibold text-[#493837]">{getSiteText(content, "cart_empty_text", "حقيبتك فارغة")}</h2>

            <p className="mt-1.5 max-w-[260px] text-[9px] leading-5 text-[#9D8E89]">اكتشف المنتجات وأضف القطع التي تحبها إلى حقيبتك.</p>

            <Link to="/products" className="mt-5 inline-flex h-[44px] items-center justify-center gap-2 rounded-full bg-[#D4777D] px-7 text-[10px] font-semibold text-white active:bg-[#C96B72]">
              {getSiteText(content, "cart_start_shopping", "ابدأ التسوق")}
              <ArrowLeft className="h-3.5 w-3.5 stroke-[1.6]" />
            </Link>
          </section>
        ) : (
          /* =========================================================
              CART
          ========================================================= */
          <section className="mx-auto grid w-full max-w-[1200px] gap-6 px-3 py-5 md:px-6 md:py-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-8">
            {/* =====================================================
                ITEMS
            ===================================================== */}
            <div className="space-y-2.5">
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#413432] md:text-[18px]">منتجات الحقيبة</h2>
                  <p className="mt-1 text-[7px] text-[#A29590] md:text-[8px]">{cart.length} منتج</p>
                </div>

                <Link to="/products" className="flex items-center gap-1 text-[8px] font-medium text-[#B86168] md:text-[9px]">
                  متابعة التسوق
                  <ArrowLeft className="h-3 w-3 stroke-[1.5]" />
                </Link>
              </div>

              {cart.map((item, index) => {
                const variant = item.variantId && item.product.variants ? item.product.variants.find((candidate) => candidate.id === item.variantId) : undefined;

                const basePrice = variant?.price !== undefined ? variant.price : item.product.price;
                const discount = variant?.discount !== undefined ? variant.discount : item.product.discount;
                const price = discount ? basePrice * (1 - discount / 100) : basePrice;

                const accessoriesTotal = item.selectedAccessories ? item.selectedAccessories.reduce((sum, accessory) => sum + accessory.price * accessory.quantity, 0) : 0;

                const unitTotal = price + accessoriesTotal;
                const itemTotal = unitTotal * item.quantity;

                const image = variant?.images?.[0] || item.product.images?.[0];

                const stock = item.product.stockQuantity;
                const maxQuantityReached = typeof stock === "number" && item.quantity >= stock;

                return (
                  <article key={`${item.product.id}-${item.variantId || "base"}-${item.selectedSize || ""}-${index}`} className="relative flex gap-3 rounded-[17px] border border-[#EEE5E1] bg-white p-2.5 md:gap-4 md:p-3.5">
                    {/* IMAGE */}
                    <Link to={`/product/${item.product.slug}`} className="relative h-[122px] w-[94px] shrink-0 overflow-hidden rounded-[13px] bg-[#F3F0EE] md:h-[150px] md:w-[118px]">
                      {image ? (
                        <img src={image} alt={item.product.nameAr} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-5 w-5 stroke-[1.3] text-[#C9BBB6]" />
                        </div>
                      )}

                      {!!discount && (
                        <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[7px] font-semibold text-[#B75F66]">
                          <Tag className="h-2.5 w-2.5" />
                          {discount}%
                        </span>
                      )}
                    </Link>

                    {/* CONTENT */}
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/product/${item.product.slug}`} className="min-w-0 flex-1">
                          {item.product.brand && <p className="mb-0.5 truncate text-[7px] tracking-[0.05em] text-[#A39791] md:text-[8px]">{item.product.brand}</p>}

                          <h3 className="line-clamp-2 text-[10px] font-semibold leading-[1.6] text-[#433634] md:text-[12px]">{item.product.nameAr}</h3>
                        </Link>

                        <button type="button" onClick={() => removeFromCart(item.product.id, item.variantId)} aria-label="حذف المنتج" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF4F2] text-[#C76B71] active:bg-[#F9E3E0]">
                          <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                        </button>
                      </div>

                      {/* OPTIONS */}
                      {(item.selectedSize || item.selectedColor) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.selectedSize && <span className="rounded-full bg-[#F7F2F0] px-2 py-1 text-[7px] text-[#796A66]">المقاس: {item.selectedSize}</span>}

                          {item.selectedColor && <span className="rounded-full bg-[#F7F2F0] px-2 py-1 text-[7px] text-[#796A66]">اللون: {item.selectedColor}</span>}
                        </div>
                      )}

                      {/* ACCESSORIES */}
                      {item.selectedAccessories && item.selectedAccessories.length > 0 && (
                        <p className="mt-1.5 line-clamp-1 text-[7px] text-[#9D8F8A]">
                          +{" "}
                          {item.selectedAccessories.map((accessory, accessoryIndex) => (
                            <span key={`${accessory.name_ar}-${accessoryIndex}`}>
                              {accessory.name_ar}
                              {accessory.quantity > 1 ? ` ×${accessory.quantity}` : ""}
                              {accessoryIndex < item.selectedAccessories!.length - 1 ? "، " : ""}
                            </span>
                          ))}
                        </p>
                      )}

                      {/* PRICE */}
                      <div className="mt-2 flex items-end gap-1.5">
                        <span className="text-[13px] font-semibold leading-none text-[#C65F68] md:text-[15px]">{formatCurrency(unitTotal)}</span>

                        {!!discount && <span className="text-[7px] leading-none text-[#AEA19C] line-through md:text-[8px]">{formatCurrency(basePrice)}</span>}
                      </div>

                      {/* BOTTOM */}
                      <div className="mt-3 flex items-end justify-between gap-3 md:mt-5">
                        <div className="flex h-[31px] items-center overflow-hidden rounded-[10px] border border-[#E6DDD9] bg-[#FFFDFC] md:h-[34px]">
                          <button type="button" onClick={() => { if (item.quantity <= 1) return; updateQuantity(item.product.id, item.quantity - 1, item.variantId); }} disabled={item.quantity <= 1} className="flex h-full w-8 items-center justify-center text-[#6A5C58] disabled:opacity-30 md:w-9">
                            <Minus className="h-3 w-3 stroke-[1.6]" />
                          </button>

                          <span className="flex h-full min-w-[28px] items-center justify-center border-x border-[#EEE5E1] px-1 text-[9px] font-semibold text-[#493B38] md:min-w-[32px]">{item.quantity}</span>

                          <button type="button" onClick={() => { if (maxQuantityReached) return; updateQuantity(item.product.id, item.quantity + 1, item.variantId); }} disabled={maxQuantityReached} className="flex h-full w-8 items-center justify-center text-[#6A5C58] disabled:opacity-30 md:w-9">
                            <Plus className="h-3 w-3 stroke-[1.6]" />
                          </button>
                        </div>

                        <div className="text-left">
                          <span className="block text-[6px] text-[#A99B96]">الإجمالي</span>
                          <span className="mt-1 block text-[11px] font-semibold leading-none text-[#594441] md:text-[13px]">{formatCurrency(itemTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* =====================================================
                ORDER SUMMARY
            ===================================================== */}
            <aside className="lg:relative">
              <div className="border-t border-[#E9DEDA] pt-5 lg:sticky lg:top-28 lg:rounded-[20px] lg:border lg:border-[#E9DEDA] lg:bg-[#FFF9F7] lg:p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FLAMINGO CHECKOUT</p>
                    <h2 className="mt-1 text-[17px] font-semibold text-[#443432]">{getSiteText(content, "cart_summary_title", "ملخص الطلب")}</h2>
                  </div>

                  <ShoppingBag className="h-5 w-5 stroke-[1.4] text-[#C96F79]" />
                </div>

                <div className="space-y-3 border-y border-[#EADFDA] py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#897A75]">{getSiteText(content, "cart_subtotal_label", "المجموع الفرعي")}</span>
                    <span className="text-[10px] font-semibold text-[#493A37]">{formatCurrency(total)}</span>
                  </div>

                </div>

                <div className="flex items-end justify-between py-5">
                  <div>
                    <span className="block text-[10px] font-semibold text-[#493A37]">{getSiteText(content, "cart_total_label", "الإجمالي")}</span>
                    <span className="mt-1 block text-[7px] text-[#A99B96]">شامل المنتجات الحالية</span>
                  </div>

                  <div className="text-left">
                    <span className="text-[23px] font-semibold leading-none text-[#B95E66]">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button type="button" onClick={() => navigate("/checkout")} className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#D4777D] text-[11px] font-semibold text-white active:bg-[#C96B72]">
                  <ShoppingBag className="h-4 w-4 stroke-[1.5]" />
                  {getSiteText(content, "cart_checkout_cta", "إتمام الطلب")}
                </button>

                <Link to="/products" className="mt-2.5 flex h-[41px] w-full items-center justify-center gap-1.5 rounded-[13px] border border-[#DED3CE] bg-white text-[9px] font-medium text-[#625450]">
                  {getSiteText(content, "cart_continue_cta", "متابعة التسوق")}
                  <ArrowLeft className="h-3 w-3 stroke-[1.5]" />
                </Link>

                <p className="mt-3 text-center text-[7px] leading-5 text-[#A29590]">يمكنك تطبيق رمز الخصم أثناء إتمام الطلب.</p>
              </div>
            </aside>
          </section>
        )}
      </main>

    </div>
  );
};

export default CartPage;