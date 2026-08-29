create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.admin_permission_gate(p_permissions text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    when not exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role = 'admin'::public.app_role
    ) then true
    else exists (
      select 1
      from unnest(coalesce(p_permissions, '{}'::text[])) as requested(permission)
      where coalesce((
        select aup.granted
        from public.admin_user_permissions aup
        where aup.user_id = (select auth.uid())
          and aup.permission = requested.permission
      ), true)
    )
  end;
$$;

revoke all on function private.admin_permission_gate(text[]) from public;
grant execute on function private.admin_permission_gate(text[]) to authenticated;

create or replace function private.require_admin_permission(p_permission text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
  v_granted boolean;
begin
  if v_role = 'service_role' then return; end if;
  if v_actor is null or not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_actor and ur.role = 'admin'::public.app_role
  ) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  select coalesce((select aup.granted from public.admin_user_permissions aup where aup.user_id=v_actor and aup.permission=p_permission), true) into v_granted;
  if not v_granted then raise exception 'admin permission % required', p_permission using errcode='42501'; end if;
end;
$$;
revoke all on function private.require_admin_permission(text) from public, anon, authenticated;

-- Catalog.
create policy "granular products insert" on public.products as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['products.edit']::text[])));
create policy "granular products update" on public.products as restrictive for update to authenticated using ((select private.admin_permission_gate(array['products.edit']::text[]))) with check ((select private.admin_permission_gate(array['products.edit']::text[])));
create policy "granular products delete" on public.products as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['products.delete']::text[])));

-- Orders and customers. Non-admin customer access remains governed by existing permissive policies.
create policy "granular orders select" on public.orders as restrictive for select to authenticated using ((select private.admin_permission_gate(array['orders.view']::text[])));
create policy "granular orders insert" on public.orders as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['orders.manage']::text[])));
create policy "granular orders update" on public.orders as restrictive for update to authenticated using ((select private.admin_permission_gate(array['orders.manage']::text[]))) with check ((select private.admin_permission_gate(array['orders.manage']::text[])));
create policy "granular orders delete" on public.orders as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['orders.delete']::text[])));
create policy "granular customers select" on public.customers as restrictive for select to authenticated using ((select private.admin_permission_gate(array['customers.view']::text[])));
create policy "granular customers insert" on public.customers as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['customers.manage']::text[])));
create policy "granular customers update" on public.customers as restrictive for update to authenticated using ((select private.admin_permission_gate(array['customers.manage']::text[]))) with check ((select private.admin_permission_gate(array['customers.manage']::text[])));
create policy "granular customers delete" on public.customers as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['customers.manage']::text[])));

-- Inventory.
create policy "granular inventory adjustments select" on public.inventory_adjustments as restrictive for select to authenticated using ((select private.admin_permission_gate(array['inventory.view','inventory.adjust']::text[])));
create policy "granular inventory adjustments insert" on public.inventory_adjustments as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['inventory.adjust']::text[])));
create policy "granular inventory adjustments update" on public.inventory_adjustments as restrictive for update to authenticated using ((select private.admin_permission_gate(array['inventory.adjust']::text[]))) with check ((select private.admin_permission_gate(array['inventory.adjust']::text[])));
create policy "granular inventory adjustments delete" on public.inventory_adjustments as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['inventory.adjust']::text[])));
create policy "granular inventory skus select" on public.inventory_skus as restrictive for select to authenticated using ((select private.admin_permission_gate(array['inventory.view','inventory.adjust','products.view','products.edit']::text[])));
create policy "granular inventory skus insert" on public.inventory_skus as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['inventory.adjust']::text[])));
create policy "granular inventory skus update" on public.inventory_skus as restrictive for update to authenticated using ((select private.admin_permission_gate(array['inventory.adjust']::text[]))) with check ((select private.admin_permission_gate(array['inventory.adjust']::text[])));
create policy "granular inventory skus delete" on public.inventory_skus as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['inventory.adjust']::text[])));

-- Product costs.
create policy "granular product costs select" on public.product_costs as restrictive for select to authenticated using ((select private.admin_permission_gate(array['products.edit','finance.view','finance.manage','reports.view']::text[])));
create policy "granular product costs insert" on public.product_costs as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['products.edit']::text[])));
create policy "granular product costs update" on public.product_costs as restrictive for update to authenticated using ((select private.admin_permission_gate(array['products.edit']::text[]))) with check ((select private.admin_permission_gate(array['products.edit']::text[])));
create policy "granular product costs delete" on public.product_costs as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['products.edit']::text[])));

-- Finance read/write boundaries. The FOR ALL write policies are split by the follow-up migration so view-only admins remain read-only.
create policy "granular financial transactions select" on public.financial_transactions as restrictive for select to authenticated using ((select private.admin_permission_gate(array['finance.view','finance.manage','reports.view']::text[])));
create policy "granular financial transactions write" on public.financial_transactions as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));
create policy "granular transaction lines select" on public.transaction_lines as restrictive for select to authenticated using ((select private.admin_permission_gate(array['finance.view','finance.manage','reports.view']::text[])));
create policy "granular transaction lines write" on public.transaction_lines as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));
create policy "granular refunds select" on public.refunds as restrictive for select to authenticated using ((select private.admin_permission_gate(array['finance.view','finance.manage','reports.view']::text[])));
create policy "granular refunds write" on public.refunds as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));
create policy "granular expenses select" on public.expenses as restrictive for select to authenticated using ((select private.admin_permission_gate(array['finance.view','finance.manage','reports.view']::text[])));
create policy "granular expenses write" on public.expenses as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));
create policy "granular expense categories select" on public.expense_categories as restrictive for select to authenticated using ((select private.admin_permission_gate(array['finance.view','finance.manage','reports.view']::text[])));
create policy "granular expense categories write" on public.expense_categories as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));
create policy "granular settlements select" on public.payment_settlements as restrictive for select to authenticated using ((select private.admin_permission_gate(array['finance.view','finance.manage','reports.view']::text[])));
create policy "granular settlements write" on public.payment_settlements as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));
create policy "granular currencies write" on public.currencies as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));
create policy "granular payment methods write" on public.payment_methods as restrictive for all to authenticated using ((select private.admin_permission_gate(array['finance.manage']::text[]))) with check ((select private.admin_permission_gate(array['finance.manage']::text[])));

-- Marketing and internal notes.
create policy "granular coupons select" on public.coupons as restrictive for select to authenticated using ((select private.admin_permission_gate(array['marketing.view','marketing.manage']::text[])));
create policy "granular coupons write" on public.coupons as restrictive for all to authenticated using ((select private.admin_permission_gate(array['marketing.manage']::text[]))) with check ((select private.admin_permission_gate(array['marketing.manage']::text[])));
create policy "granular whatsapp templates select" on public.whatsapp_templates as restrictive for select to authenticated using ((select private.admin_permission_gate(array['marketing.view','marketing.manage']::text[])));
create policy "granular whatsapp templates write" on public.whatsapp_templates as restrictive for all to authenticated using ((select private.admin_permission_gate(array['marketing.manage']::text[]))) with check ((select private.admin_permission_gate(array['marketing.manage']::text[])));
create policy "granular customer notes select" on public.customer_internal_notes as restrictive for select to authenticated using ((select private.admin_permission_gate(array['customers.view','customers.manage']::text[])));
create policy "granular customer notes write" on public.customer_internal_notes as restrictive for all to authenticated using ((select private.admin_permission_gate(array['customers.manage']::text[]))) with check ((select private.admin_permission_gate(array['customers.manage']::text[])));
create policy "granular order notes select" on public.order_internal_notes as restrictive for select to authenticated using ((select private.admin_permission_gate(array['orders.view','orders.manage']::text[])));
create policy "granular order notes write" on public.order_internal_notes as restrictive for all to authenticated using ((select private.admin_permission_gate(array['orders.manage']::text[]))) with check ((select private.admin_permission_gate(array['orders.manage']::text[])));

-- Permission and role administration.
create policy "granular admin permission insert" on public.admin_user_permissions as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['admin.permissions.manage']::text[])) and not (user_id=(select auth.uid()) and permission='admin.permissions.manage' and granted=false));
create policy "granular admin permission update" on public.admin_user_permissions as restrictive for update to authenticated using ((select private.admin_permission_gate(array['admin.permissions.manage']::text[]))) with check ((select private.admin_permission_gate(array['admin.permissions.manage']::text[])) and not (user_id=(select auth.uid()) and permission='admin.permissions.manage' and granted=false));
create policy "granular admin permission delete" on public.admin_user_permissions as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['admin.permissions.manage']::text[])));
create policy "granular user roles insert" on public.user_roles as restrictive for insert to authenticated with check ((select private.admin_permission_gate(array['admin.permissions.manage']::text[])));
create policy "granular user roles update" on public.user_roles as restrictive for update to authenticated using ((select private.admin_permission_gate(array['admin.permissions.manage']::text[]))) with check ((select private.admin_permission_gate(array['admin.permissions.manage']::text[])));
create policy "granular user roles delete" on public.user_roles as restrictive for delete to authenticated using ((select private.admin_permission_gate(array['admin.permissions.manage']::text[])));
create policy "granular approval review update" on public.admin_approval_requests as restrictive for update to authenticated using ((select private.admin_permission_gate(array['admin.approvals.review']::text[]))) with check ((select private.admin_permission_gate(array['admin.approvals.review']::text[])));

-- SECURITY DEFINER admin RPCs bypass RLS, so inject permission checks into their existing bodies.
do $$
declare
  r record;
  v_def text;
  v_marker constant text := E'\nbegin\n';
  v_pos integer;
begin
  for r in select * from (values
    ('public.admin_create_product_draft_from_excel(jsonb)'::regprocedure,E'  perform private.require_admin_permission(''products.bulk_update'');\n  perform private.require_admin_permission(''products.edit'');\n'),
    ('public.admin_duplicate_product(uuid)'::regprocedure,E'  perform private.require_admin_permission(''products.edit'');\n'),
    ('public.admin_update_inventory_sku_from_excel(uuid,integer)'::regprocedure,E'  perform private.require_admin_permission(''inventory.adjust'');\n'),
    ('public.apply_inventory_adjustment(uuid,text,integer,text,text,text,uuid)'::regprocedure,E'  perform private.require_admin_permission(''inventory.adjust'');\n'),
    ('public.create_manual_journal_entry(date,text,text,text,jsonb)'::regprocedure,E'  perform private.require_admin_permission(''finance.manage'');\n'),
    ('public.create_refund_request(uuid,text,uuid,text,text,numeric,text,text,text,jsonb,text,text)'::regprocedure,E'  perform private.require_admin_permission(''finance.manage'');\n'),
    ('public.delete_coupon_safe(uuid)'::regprocedure,E'  perform private.require_admin_permission(''marketing.manage'');\n'),
    ('public.delete_currency_safe(text)'::regprocedure,E'  perform private.require_admin_permission(''finance.manage'');\n'),
    ('public.delete_product_from_inventory(uuid)'::regprocedure,E'  perform private.require_admin_permission(''products.delete'');\n'),
    ('public.delete_refund_safe(uuid)'::regprocedure,E'  perform private.require_admin_permission(''finance.manage'');\n'),
    ('public.replace_product_inventory_skus(uuid,jsonb)'::regprocedure,E'  perform private.require_admin_permission(''inventory.adjust'');\n'),
    ('public.reverse_journal_entry(uuid,date,text)'::regprocedure,E'  perform private.require_admin_permission(''finance.manage'');\n'),
    ('public.update_refund_status(uuid,text,text)'::regprocedure,E'  perform private.require_admin_permission(''finance.manage'');\n')
  ) as guards(fn,guard_sql)
  loop
    v_def:=pg_get_functiondef(r.fn::oid); v_pos:=strpos(v_def,v_marker);
    if v_pos=0 then raise exception 'Could not locate main begin block for %',r.fn; end if;
    v_def:=substr(v_def,1,v_pos-1)||v_marker||r.guard_sql||substr(v_def,v_pos+length(v_marker));
    execute v_def;
  end loop;

  v_def:=pg_get_functiondef('public.admin_quick_update_product(uuid,jsonb)'::regprocedure::oid); v_pos:=strpos(v_def,v_marker);
  if v_pos=0 then raise exception 'Could not locate main begin block for admin_quick_update_product'; end if;
  v_def:=substr(v_def,1,v_pos-1)||v_marker
    ||E'  if coalesce(p_patch, ''{}''::jsonb) ?| array[''stock_quantity'',''in_stock''] then\n    perform private.require_admin_permission(''inventory.adjust'');\n  end if;\n'
    ||E'  if exists (select 1 from jsonb_object_keys(coalesce(p_patch, ''{}''::jsonb)) as k(key) where k.key not in (''stock_quantity'',''in_stock'')) then\n    perform private.require_admin_permission(''products.edit'');\n  end if;\n'
    ||substr(v_def,v_pos+length(v_marker));
  execute v_def;
end;
$$;
