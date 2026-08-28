import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/store/useStore";

const CustomerCartSync = () => {
  const cart = useStore((state) => state.cart);
  const currencyMode = useStore((state) => state.currencyMode);
  const customer = useStore((state) => state.customer);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      const cartValue = cart.reduce((sum, item) => {
        const price = Number(item.product.price || 0);
        const accessories = (item.selectedAccessories || []).reduce((total, accessory) => total + Number(accessory.price || 0) * accessory.quantity, 0);
        return sum + (price + accessories) * item.quantity;
      }, 0);

      const items = cart.map((item) => ({
        product_id: item.product.id,
        slug: item.product.slug,
        name: item.product.nameAr || item.product.name,
        image: item.product.images?.[0] || null,
        price: Number(item.product.price || 0),
        quantity: item.quantity,
        size: item.selectedSize || null,
        color: item.selectedColor || item.variantColor || null,
        variant_id: item.variantId || null,
      }));

      const payload = {
        user_id: user.id,
        customer_id: customer?.id || null,
        items,
        item_count: itemCount,
        cart_value: Math.max(0, Number(cartValue.toFixed(2))),
        currency: currencyMode,
        status: itemCount > 0 ? "active" : "cleared",
        abandoned_at: null,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any).from("customer_carts").upsert(payload, { onConflict: "user_id" });
      if (error && import.meta.env.DEV) console.warn("[customer-cart-sync] failed", error);
    }, 700);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [cart, currencyMode, customer?.id]);

  return null;
};

export default CustomerCartSync;
