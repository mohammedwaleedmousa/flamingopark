
-- 1) Delivery tracking table
CREATE TABLE public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.customer_notifications(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('inapp', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_deliveries_notif ON public.notification_deliveries(notification_id);
CREATE INDEX idx_notif_deliveries_customer ON public.notification_deliveries(customer_id);
CREATE INDEX idx_notif_deliveries_status ON public.notification_deliveries(status);
CREATE INDEX idx_notif_deliveries_created ON public.notification_deliveries(created_at DESC);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;

-- 3) RLS
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage all deliveries"
  ON public.notification_deliveries
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Customers can view their own delivery rows
CREATE POLICY "Customers view own deliveries"
  ON public.notification_deliveries
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Customers can update read state on their own rows
CREATE POLICY "Customers mark own delivery read"
  ON public.notification_deliveries
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- 4) updated_at trigger
CREATE TRIGGER trg_notification_deliveries_updated_at
BEFORE UPDATE ON public.notification_deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Sync read status from customer_notifications to deliveries
CREATE OR REPLACE FUNCTION public.sync_notification_read_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_read = true AND (OLD.is_read IS DISTINCT FROM true) THEN
    UPDATE public.notification_deliveries
       SET status = 'read',
           read_at = COALESCE(read_at, now())
     WHERE notification_id = NEW.id
       AND channel = 'inapp'
       AND (NEW.customer_id IS NULL OR customer_id = NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_notif_read
AFTER UPDATE OF is_read ON public.customer_notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_notification_read_status();
