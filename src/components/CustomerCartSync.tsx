import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/store/useStore";

const SYNC_DELAY_MS = 900;

const CustomerCartSync = () => {
  const cart = useStore((state) => state.cart);
  const currencyMode = useStore((state) => state.currencyMode);
  const customerId = useStore((state) => state.customer?.id || null);
  const timer = useRef<number | null>(null);
  const lastPayload = useRef<string>("");

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

      if (itemCount === 0) {
        const { data: existingCart } = await (supabase as any)
          .from("customer_carts")
          .select("status,converted_order_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingCart?.status === "converted" && existingCart?.converted_order_id) {
          lastPayload.current = `converted:${existingCart.converted_order_id}`;
          return;
        }
      }

      const cartValue = cart.reduce((sum, item) => {
        const variant = item.variantId && item.product.variants
          ? item.product.variants.find((candidate) => candidate.id === item.variantId)
          : undefined;
        const basePrice = variant?.price ?? item.product.price;
        const discount = variant?.discount ?? item.product.discount;
        const unitPrice = discount ? basePrice * (1 - discount / 100) : basePrice;
        const accessories = (item.selectedAccessories || []).reduce(
          (total, accessory) => total + Number(accessory.price || 0) * accessory.quantity,
          0
        );
        return sum + (unitPrice + accessories) * item.quantity;
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

      const stablePayload = {
        customer_id: customerId,
        items,
        item_count: itemCount,
        cart_value: Math.max(0, Number(cartValue.toFixed(2))),
        currency: currencyMode,
        status: itemCount > 0 ? "active" : "cleared",
      };
      const signature = JSON.stringify(stablePayload);
      if (signature === lastPayload.current) return;

      const now = new Date().toISOString();
      const { error } = await (supabase as any).from("customer_carts").upsert(
        {
          user_id: user.id,
          ...stablePayload,
          ...(itemCount > 0 ? { converted_order_id: null } : {}),
          abandoned_at: null,
          last_activity_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

      if (!error) {
        lastPayload.current = signature;
      } else if (import.meta.env.DEV) {
        console.warn("[customer-cart-sync] failed", error);
      }
    }, SYNC_DELAY_MS);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [cart, currencyMode, customerId]);

  return null;
};

export default CustomerCartSync;
