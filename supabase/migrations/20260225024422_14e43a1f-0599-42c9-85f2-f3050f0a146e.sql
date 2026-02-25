
-- Create orders_archive table to persist orders even when deleted from admin
CREATE TABLE public.orders_archive (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_order_id uuid NOT NULL,
  order_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  customer_notes text,
  country text NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total numeric NOT NULL,
  coupon_code text,
  beneficiary_code text,
  beneficiary_commission numeric DEFAULT 0,
  beneficiary_id uuid,
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(original_order_id)
);

-- Enable RLS
ALTER TABLE public.orders_archive ENABLE ROW LEVEL SECURITY;

-- Only allow public read (password protection is in the app)
CREATE POLICY "Orders archive is readable by everyone"
  ON public.orders_archive FOR SELECT
  USING (true);

-- Admins can manage archive
CREATE POLICY "Admins can manage orders archive"
  ON public.orders_archive FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function to auto-archive orders on insert
CREATE OR REPLACE FUNCTION public.archive_order_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.orders_archive (
    original_order_id, order_number, customer_name, customer_phone,
    customer_address, customer_notes, country, payment_method, status,
    items, subtotal, delivery_fee, discount_amount, total,
    coupon_code, beneficiary_code, beneficiary_commission, beneficiary_id,
    invoice_url, created_at
  ) VALUES (
    NEW.id, NEW.order_number, NEW.customer_name, NEW.customer_phone,
    NEW.customer_address, NEW.customer_notes, NEW.country, NEW.payment_method, NEW.status,
    NEW.items, NEW.subtotal, NEW.delivery_fee, NEW.discount_amount, NEW.total,
    NEW.coupon_code, NEW.beneficiary_code, NEW.beneficiary_commission, NEW.beneficiary_id,
    NEW.invoice_url, NEW.created_at
  )
  ON CONFLICT (original_order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER archive_order_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_order_on_insert();

-- Also update archive when order status changes
CREATE OR REPLACE FUNCTION public.update_archive_on_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.orders_archive
  SET status = NEW.status,
      invoice_url = NEW.invoice_url
  WHERE original_order_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_archive_after_order_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_archive_on_order_update();

-- Backfill: copy all existing orders into archive
INSERT INTO public.orders_archive (
  original_order_id, order_number, customer_name, customer_phone,
  customer_address, customer_notes, country, payment_method, status,
  items, subtotal, delivery_fee, discount_amount, total,
  coupon_code, beneficiary_code, beneficiary_commission, beneficiary_id,
  invoice_url, created_at
)
SELECT
  id, order_number, customer_name, customer_phone,
  customer_address, customer_notes, country, payment_method, status,
  items, subtotal, delivery_fee, discount_amount, total,
  coupon_code, beneficiary_code, beneficiary_commission, beneficiary_id,
  invoice_url, created_at
FROM public.orders
ON CONFLICT (original_order_id) DO NOTHING;
