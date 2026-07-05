-- Add explicit currency mode for expenses so financial KPIs can be normalized to SAR
alter table public.expenses
add column if not exists currency_mode text;

update public.expenses
set currency_mode = coalesce(currency_mode, 'SAR');

alter table public.expenses
alter column currency_mode set default 'SAR';

alter table public.expenses
alter column currency_mode set not null;

alter table public.expenses
drop constraint if exists expenses_currency_mode_check;

alter table public.expenses
add constraint expenses_currency_mode_check
check (currency_mode in ('SAR', 'YER_SOUTH', 'YER_NORTH'));

create index if not exists idx_expenses_currency_mode_date
on public.expenses(currency_mode, expense_date desc);
