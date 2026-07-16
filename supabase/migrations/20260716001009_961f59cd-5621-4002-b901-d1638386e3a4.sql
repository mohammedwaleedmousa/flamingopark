
CREATE TABLE public.currencies (
  code text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  symbol text NOT NULL,
  rate_to_base numeric(20,6) NOT NULL DEFAULT 1,
  is_base boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currencies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies public read" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "currencies admin manage" ON public.currencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_currencies_updated_at BEFORE UPDATE ON public.currencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.currencies (code, name_ar, name_en, symbol, rate_to_base, is_base, sort_order) VALUES
  ('SAR','ريال سعودي','Saudi Riyal','ر.س',1,true,1),
  ('YER_S','ريال يمني (جنوبي)','Yemeni Rial (South)','ر.ي.ج',550,false,2),
  ('YER_N','ريال يمني (شمالي)','Yemeni Rial (North)','ر.ي.ش',700,false,3);

CREATE TABLE public.countries (
  code text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  flag_emoji text,
  phone_code text,
  default_currency text REFERENCES public.currencies(code) ON DELETE SET NULL,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries public read" ON public.countries FOR SELECT USING (true);
CREATE POLICY "countries admin manage" ON public.countries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_countries_updated_at BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.countries (code, name_ar, name_en, flag_emoji, phone_code, default_currency, is_featured, sort_order) VALUES
  ('SA','السعودية','Saudi Arabia','🇸🇦','+966','SAR',true,1),
  ('YE','اليمن','Yemen','🇾🇪','+967','YER_S',true,2),
  ('AE','الإمارات','United Arab Emirates','🇦🇪','+971','SAR',false,3),
  ('KW','الكويت','Kuwait','🇰🇼','+965','SAR',false,4),
  ('QA','قطر','Qatar','🇶🇦','+974','SAR',false,5),
  ('BH','البحرين','Bahrain','🇧🇭','+973','SAR',false,6),
  ('OM','عُمان','Oman','🇴🇲','+968','SAR',false,7),
  ('EG','مصر','Egypt','🇪🇬','+20','SAR',false,8),
  ('JO','الأردن','Jordan','🇯🇴','+962','SAR',false,9),
  ('IQ','العراق','Iraq','🇮🇶','+964','SAR',false,10),
  ('SY','سوريا','Syria','🇸🇾','+963','SAR',false,11),
  ('LB','لبنان','Lebanon','🇱🇧','+961','SAR',false,12),
  ('PS','فلسطين','Palestine','🇵🇸','+970','SAR',false,13),
  ('MA','المغرب','Morocco','🇲🇦','+212','SAR',false,14),
  ('DZ','الجزائر','Algeria','🇩🇿','+213','SAR',false,15),
  ('TN','تونس','Tunisia','🇹🇳','+216','SAR',false,16),
  ('LY','ليبيا','Libya','🇱🇾','+218','SAR',false,17),
  ('SD','السودان','Sudan','🇸🇩','+249','SAR',false,18),
  ('SO','الصومال','Somalia','🇸🇴','+252','SAR',false,19),
  ('DJ','جيبوتي','Djibouti','🇩🇯','+253','SAR',false,20),
  ('MR','موريتانيا','Mauritania','🇲🇷','+222','SAR',false,21),
  ('KM','جزر القمر','Comoros','🇰🇲','+269','SAR',false,22),
  ('TR','تركيا','Turkey','🇹🇷','+90','SAR',false,23),
  ('US','الولايات المتحدة','United States','🇺🇸','+1','SAR',false,24),
  ('GB','المملكة المتحدة','United Kingdom','🇬🇧','+44','SAR',false,25),
  ('DE','ألمانيا','Germany','🇩🇪','+49','SAR',false,26),
  ('FR','فرنسا','France','🇫🇷','+33','SAR',false,27),
  ('IN','الهند','India','🇮🇳','+91','SAR',false,28),
  ('PK','باكستان','Pakistan','🇵🇰','+92','SAR',false,29),
  ('ID','إندونيسيا','Indonesia','🇮🇩','+62','SAR',false,30);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'SAR' REFERENCES public.currencies(code),
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot numeric(20,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_base numeric(20,4);
UPDATE public.orders
   SET currency_code = COALESCE(currency_code,'SAR'),
       exchange_rate_snapshot = COALESCE(exchange_rate_snapshot,1),
       total_base = COALESCE(total_base, total);

ALTER TABLE public.orders_archive
  ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot numeric(20,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_base numeric(20,4);
UPDATE public.orders_archive
   SET currency_code = COALESCE(currency_code,'SAR'),
       exchange_rate_snapshot = COALESCE(exchange_rate_snapshot,1),
       total_base = COALESCE(total_base, total);

CREATE OR REPLACE FUNCTION public.archive_order_on_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.orders_archive (
    original_order_id, order_number, customer_name, customer_phone,
    customer_address, customer_notes, country, payment_method, status,
    items, subtotal, delivery_fee, discount_amount, total,
    coupon_code, invoice_url, created_at,
    currency_code, exchange_rate_snapshot, total_base
  ) VALUES (
    NEW.id, NEW.order_number, NEW.customer_name, NEW.customer_phone,
    NEW.customer_address, NEW.customer_notes, NEW.country, NEW.payment_method, NEW.status,
    NEW.items, NEW.subtotal, NEW.delivery_fee, NEW.discount_amount, NEW.total,
    NEW.coupon_code, NEW.invoice_url, NEW.created_at,
    COALESCE(NEW.currency_code,'SAR'), COALESCE(NEW.exchange_rate_snapshot,1),
    COALESCE(NEW.total_base, NEW.total)
  )
  ON CONFLICT (original_order_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'SAR' REFERENCES public.currencies(code),
  ADD COLUMN IF NOT EXISTS amount_base numeric(20,4);
UPDATE public.expenses SET currency_code = COALESCE(currency_code,'SAR'), amount_base = COALESCE(amount_base, amount);

ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'SAR' REFERENCES public.currencies(code),
  ADD COLUMN IF NOT EXISTS amount_base numeric(20,4);
UPDATE public.refunds SET currency_code = COALESCE(currency_code,'SAR'), amount_base = COALESCE(amount_base, amount);
