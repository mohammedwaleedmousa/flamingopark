-- Customer notifications table for admin-to-customer messaging
z
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone text,
  country text,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  broadcast boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cust_notif_user ON public.customer_notifications(user_id, created_at DESC);
CREATE INDEX idx_cust_notif_phone ON public.customer_notifications(customer_phone, created_at DESC);
CREATE INDEX idx_cust_notif_customer ON public.customer_notifications(customer_id, created_at DESC);
CREATE INDEX idx_cust_notif_broadcast ON public.customer_notifications(broadcast, country, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notifications TO authenticated;
GRANT SELECT ON public.customer_notifications TO anon;
GRANT ALL ON public.customer_notifications TO service_role;

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

-- Admins full manage
CREATE POLICY "admins manage customer notifications"
  ON public.customer_notifications
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated user reads own (matched by user_id OR broadcast to their country)
CREATE POLICY "users read own notifications"
  ON public.customer_notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR broadcast = true
  );

-- Anon can read broadcasts (used for phone-based guest flows via unauthenticated preview)
CREATE POLICY "anon read broadcasts"
  ON public.customer_notifications
  FOR SELECT
  TO anon
  USING (broadcast = true);

-- Authenticated user updates own read flag
CREATE POLICY "users mark own notifications read"
  ON public.customer_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_customer_notifications_updated_at
  BEFORE UPDATE ON public.customer_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;