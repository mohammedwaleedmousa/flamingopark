
-- ====== 1. CLEANUP: BENEFICIARIES + SA ======
DROP TRIGGER IF EXISTS trg_notify_admin_on_beneficiary_order ON public.orders;
DROP FUNCTION IF EXISTS public.notify_admin_on_beneficiary_order() CASCADE;

ALTER TABLE public.orders DROP COLUMN IF EXISTS beneficiary_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS beneficiary_code;
ALTER TABLE public.orders DROP COLUMN IF EXISTS beneficiary_commission;
ALTER TABLE public.orders_archive DROP COLUMN IF EXISTS beneficiary_id;
ALTER TABLE public.orders_archive DROP COLUMN IF EXISTS beneficiary_code;
ALTER TABLE public.orders_archive DROP COLUMN IF EXISTS beneficiary_commission;
ALTER TABLE public.admin_notifications DROP COLUMN IF EXISTS related_beneficiary_id;

DROP TABLE IF EXISTS public.beneficiary_visits CASCADE;
DROP TABLE IF EXISTS public.beneficiaries CASCADE;

-- Recreate archive trigger without beneficiary fields
CREATE OR REPLACE FUNCTION public.archive_order_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.orders_archive (
    original_order_id, order_number, customer_name, customer_phone,
    customer_address, customer_notes, country, payment_method, status,
    items, subtotal, delivery_fee, discount_amount, total,
    coupon_code, invoice_url, created_at
  ) VALUES (
    NEW.id, NEW.order_number, NEW.customer_name, NEW.customer_phone,
    NEW.customer_address, NEW.customer_notes, NEW.country, NEW.payment_method, NEW.status,
    NEW.items, NEW.subtotal, NEW.delivery_fee, NEW.discount_amount, NEW.total,
    NEW.coupon_code, NEW.invoice_url, NEW.created_at
  )
  ON CONFLICT (original_order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Unify on YE: remove SA COD regions
DELETE FROM public.cod_regions WHERE country = 'SA';
ALTER TABLE public.orders ALTER COLUMN country SET DEFAULT 'YE';

-- ====== 2. CHART OF ACCOUNTS ======
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','revenue','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text NOT NULL,
  type public.account_type NOT NULL,
  parent_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_of_accounts TO authenticated;
GRANT ALL ON public.chart_of_accounts TO service_role;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage chart of accounts" ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_coa_updated BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== 3. DOUBLE-ENTRY LEDGER ======
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  description text NOT NULL,
  source_type text,
  source_id uuid,
  is_posted boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage financial transactions" ON public.financial_transactions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_ft_date ON public.financial_transactions(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ft_source ON public.financial_transactions(source_type, source_id);
CREATE TRIGGER trg_ft_updated BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.transaction_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_lines TO authenticated;
GRANT ALL ON public.transaction_lines TO service_role;
ALTER TABLE public.transaction_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage transaction lines" ON public.transaction_lines
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_tl_tx ON public.transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tl_account ON public.transaction_lines(account_id);

-- ====== 4. REFUNDS ======
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number text NOT NULL UNIQUE DEFAULT ('RF-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  customer_name text,
  customer_phone text,
  amount numeric(14,2) NOT NULL,
  reason text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  refund_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  processed_at timestamptz,
  processed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage refunds" ON public.refunds
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);
CREATE TRIGGER trg_refunds_updated BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== 5. EXPENSES ======
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  description text NOT NULL,
  vendor text,
  payment_method_id uuid,
  receipt_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== 6. PAYMENT METHODS + SETTLEMENTS ======
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text NOT NULL,
  type text NOT NULL DEFAULT 'cash',
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payment methods" ON public.payment_methods
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Everyone can view active payment methods" ON public.payment_methods
  FOR SELECT TO anon, authenticated USING (is_active = true);
GRANT SELECT ON public.payment_methods TO anon;
CREATE TRIGGER trg_pm_updated BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_fk FOREIGN KEY (payment_method_id)
  REFERENCES public.payment_methods(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.payment_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  expected_amount numeric(14,2) NOT NULL DEFAULT 0,
  actual_amount numeric(14,2) NOT NULL DEFAULT 0,
  difference numeric(14,2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_settlements TO authenticated;
GRANT ALL ON public.payment_settlements TO service_role;
ALTER TABLE public.payment_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settlements" ON public.payment_settlements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.payment_settlements(settlement_date DESC);
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.payment_settlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== 7. INVENTORY ADJUSTMENTS ======
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  adjustment_type text NOT NULL,
  quantity_before int NOT NULL DEFAULT 0,
  quantity_change int NOT NULL,
  quantity_after int NOT NULL,
  unit_cost numeric(14,2) DEFAULT 0,
  total_cost numeric(14,2) GENERATED ALWAYS AS (ABS(quantity_change) * COALESCE(unit_cost, 0)) STORED,
  reason text NOT NULL,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_adjustments TO authenticated;
GRANT ALL ON public.inventory_adjustments TO service_role;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inventory adjustments" ON public.inventory_adjustments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_inv_adj_product ON public.inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_adj_date ON public.inventory_adjustments(created_at DESC);

-- ====== 8. SEED DATA ======
INSERT INTO public.chart_of_accounts (code, name, name_ar, type) VALUES
  ('1000','Cash','الصندوق النقدي','asset'),
  ('1010','Bank','الحساب البنكي','asset'),
  ('1100','Accounts Receivable','الذمم المدينة','asset'),
  ('1200','Inventory','المخزون','asset'),
  ('2000','Accounts Payable','الذمم الدائنة','liability'),
  ('3000','Owner Equity','حقوق الملكية','equity'),
  ('4000','Sales Revenue','إيرادات المبيعات','revenue'),
  ('4100','Shipping Revenue','إيرادات الشحن','revenue'),
  ('5000','Cost of Goods Sold','تكلفة البضاعة المباعة','expense'),
  ('5100','Sales Returns','مردودات المبيعات','expense'),
  ('6000','Rent','إيجار','expense'),
  ('6100','Salaries','رواتب','expense'),
  ('6200','Utilities','مرافق','expense'),
  ('6300','Marketing','تسويق','expense'),
  ('6400','Shipping Costs','تكاليف الشحن','expense'),
  ('6500','Other Operating Expenses','مصروفات تشغيلية أخرى','expense'),
  ('6600','Inventory Adjustments','تسويات المخزون','expense')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.expense_categories (name, name_ar, account_id) VALUES
  ('Rent','إيجار', (SELECT id FROM public.chart_of_accounts WHERE code='6000')),
  ('Salaries','رواتب', (SELECT id FROM public.chart_of_accounts WHERE code='6100')),
  ('Utilities','مرافق', (SELECT id FROM public.chart_of_accounts WHERE code='6200')),
  ('Marketing','تسويق', (SELECT id FROM public.chart_of_accounts WHERE code='6300')),
  ('Shipping','شحن', (SELECT id FROM public.chart_of_accounts WHERE code='6400')),
  ('Other','أخرى', (SELECT id FROM public.chart_of_accounts WHERE code='6500'))
ON CONFLICT DO NOTHING;

INSERT INTO public.payment_methods (code, name, name_ar, type, account_id, sort_order) VALUES
  ('cash','Cash on Delivery','الدفع عند الاستلام','cash', (SELECT id FROM public.chart_of_accounts WHERE code='1000'), 1),
  ('bank','Bank Transfer','تحويل بنكي','bank', (SELECT id FROM public.chart_of_accounts WHERE code='1010'), 2)
ON CONFLICT (code) DO NOTHING;
