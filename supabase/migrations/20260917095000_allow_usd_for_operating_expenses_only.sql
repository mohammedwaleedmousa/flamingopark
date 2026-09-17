-- Allow USD for operating expenses while keeping it unavailable to other active-currency flows.
alter table public.expenses
drop constraint if exists expenses_currency_mode_check;

alter table public.expenses
add constraint expenses_currency_mode_check
check (currency_mode in ('SAR', 'YER_SOUTH', 'YER_NORTH', 'USD'));

insert into public.currencies (code, name_ar, name_en, symbol, rate_to_base, is_base, is_active, sort_order)
values ('USD', 'دولار أمريكي', 'US Dollar', '$', 0.2666666667, false, false, 99)
on conflict (code) do update
set name_ar = excluded.name_ar,
    name_en = excluded.name_en,
    symbol = excluded.symbol,
    rate_to_base = excluded.rate_to_base,
    is_base = false,
    is_active = false,
    sort_order = excluded.sort_order;
