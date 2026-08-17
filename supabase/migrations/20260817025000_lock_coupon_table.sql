drop policy if exists "Coupons are viewable by everyone" on public.coupons;

revoke select, insert, update, delete, truncate, references, trigger on public.coupons from anon;
revoke insert, update, delete, truncate, references, trigger on public.coupons from authenticated;
grant select on public.coupons to authenticated;

-- Authenticated users still require the existing admin RLS policy to read coupons.
-- Storefront clients validate a single code through validate_customer_coupon(text).
