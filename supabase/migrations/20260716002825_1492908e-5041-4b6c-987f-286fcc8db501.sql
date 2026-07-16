
-- 1) Add stock_quantity column
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

-- 2) Grants for Data API on products (fixes silent insert failure)
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- 3) Ensure common admin-managed tables also have grants (defensive - no-op if already granted)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','orders_archive','customers','profiles','categories','brands',
    'homepage_sections','banners','offers','coupons','currencies','countries',
    'reviews','product_reviews','delivery_companies','cod_regions',
    'site_settings','site_content','analytics_events','customer_notifications',
    'notification_deliveries','audit_logs','financial_transactions',
    'expenses','expense_categories','refunds','payment_methods',
    'payment_settlements','inventory_adjustments','user_roles','brand_sections',
    'certification_images','chart_of_accounts','transaction_lines','offers_settings',
    'admin_notifications'
  ]
  LOOP
    BEGIN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END$$;

-- 4) Trigger: decrement stock on order insert
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it JSONB;
  pid UUID;
  qty INTEGER;
BEGIN
  IF NEW.items IS NULL THEN RETURN NEW; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    BEGIN
      pid := (it->>'product_id')::uuid;
      qty := COALESCE((it->>'quantity')::int, 1);
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
    IF pid IS NOT NULL THEN
      UPDATE public.products
         SET stock_quantity = GREATEST(0, stock_quantity - qty),
             in_stock = (GREATEST(0, stock_quantity - qty) > 0)
       WHERE id = pid;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decrement_stock_on_order_trg ON public.orders;
CREATE TRIGGER decrement_stock_on_order_trg
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_order();
