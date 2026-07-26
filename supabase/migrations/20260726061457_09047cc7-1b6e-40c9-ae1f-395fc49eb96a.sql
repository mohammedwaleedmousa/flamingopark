
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  it JSONB;
  pid UUID;
  qty INTEGER;
BEGIN
  -- Only decrement inventory for actually-confirmed orders
  IF NEW.status IS NULL OR NEW.status NOT IN ('confirmed','shipped','delivered','completed') THEN
    RETURN NEW;
  END IF;
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
$function$;
