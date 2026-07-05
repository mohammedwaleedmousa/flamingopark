-- Add explicit currency mode for multi-currency analytics and reporting
-- Allowed values:
--   SAR        : Saudi Riyal
--   YER_SOUTH  : Yemeni Riyal (South)
--   YER_NORTH  : Yemeni Riyal (North)

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS currency_mode text;

-- Backfill historical rows using legacy country as a best-effort mapping.
-- If country=SA -> SAR, everything else defaults to YER_SOUTH.
UPDATE public.orders
SET currency_mode = CASE
  WHEN country = 'SA' THEN 'SAR'
  ELSE 'YER_SOUTH'
END
WHERE currency_mode IS NULL;

ALTER TABLE public.orders
ALTER COLUMN currency_mode SET DEFAULT 'SAR';

ALTER TABLE public.orders
ALTER COLUMN currency_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_currency_mode_check'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_currency_mode_check
    CHECK (currency_mode IN ('SAR', 'YER_SOUTH', 'YER_NORTH'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_currency_mode_created_at
  ON public.orders (currency_mode, created_at DESC);
