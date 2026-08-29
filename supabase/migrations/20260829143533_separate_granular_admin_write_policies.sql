-- Restrictive FOR ALL policies also apply to SELECT and would over-restrict
-- view-only admins. Split write enforcement by operation.
do $$
declare
  r record;
  tbl regclass;
  policy_base text;
  perms text[];
begin
  for r in
    select * from (values
      ('public.financial_transactions','granular financial transactions write',array['finance.manage']::text[]),
      ('public.transaction_lines','granular transaction lines write',array['finance.manage']::text[]),
      ('public.refunds','granular refunds write',array['finance.manage']::text[]),
      ('public.expenses','granular expenses write',array['finance.manage']::text[]),
      ('public.expense_categories','granular expense categories write',array['finance.manage']::text[]),
      ('public.payment_settlements','granular settlements write',array['finance.manage']::text[]),
      ('public.currencies','granular currencies write',array['finance.manage']::text[]),
      ('public.payment_methods','granular payment methods write',array['finance.manage']::text[]),
      ('public.coupons','granular coupons write',array['marketing.manage']::text[]),
      ('public.whatsapp_templates','granular whatsapp templates write',array['marketing.manage']::text[]),
      ('public.customer_internal_notes','granular customer notes write',array['customers.manage']::text[]),
      ('public.order_internal_notes','granular order notes write',array['orders.manage']::text[])
    ) as x(table_name, old_policy, permission_array)
  loop
    tbl := r.table_name::regclass;
    execute format('drop policy if exists %I on %s', r.old_policy, tbl);
    policy_base := r.old_policy;
    perms := r.permission_array;

    execute format(
      'create policy %I on %s as restrictive for insert to authenticated with check ((select private.admin_permission_gate(%L::text[])))',
      policy_base || ' insert', tbl, perms::text
    );
    execute format(
      'create policy %I on %s as restrictive for update to authenticated using ((select private.admin_permission_gate(%L::text[]))) with check ((select private.admin_permission_gate(%L::text[])))',
      policy_base || ' update', tbl, perms::text, perms::text
    );
    execute format(
      'create policy %I on %s as restrictive for delete to authenticated using ((select private.admin_permission_gate(%L::text[])))',
      policy_base || ' delete', tbl, perms::text
    );
  end loop;
end;
$$;
