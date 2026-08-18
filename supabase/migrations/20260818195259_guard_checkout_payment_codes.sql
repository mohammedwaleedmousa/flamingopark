-- Keep storefront payment codes compatible with create_secure_order_v2.
-- Cash may use legacy aliases but bank must keep the canonical bank code.
update public.payment_methods
set code = case
  when type = 'cash' then 'cash'
  when type = 'bank' then 'bank'
  else code
end,
updated_at = now()
where type in ('cash', 'bank')
  and code not in ('cash', 'cod', 'bank');

alter table public.payment_methods drop constraint if exists payment_methods_checkout_code_check;
alter table public.payment_methods
  add constraint payment_methods_checkout_code_check
  check (
    (type = 'cash' and code in ('cash', 'cod'))
    or (type = 'bank' and code = 'bank')
  );
