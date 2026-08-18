-- Final launch-readiness cleanup.
-- Keeps existing features intact while removing unsafe placeholder data and reconciling legacy inventory.

-- Reconcile product stock flags/quantities from the authoritative SKU inventory rows.
do $$
declare
  item record;
begin
  for item in select distinct product_id from public.inventory_skus loop
    perform public.sync_product_inventory_from_skus(item.product_id);
  end loop;
end $$;

-- All currently uncategorized active products with obvious bag names belong to the existing bags category.
update public.products
set category_id = (select id from public.categories where slug = 'bags' limit 1),
    category = 'bags'
where is_active = true
  and category_id is null
  and (
    coalesce(name_ar, '') ~ '(شنط|شطن|حقيب)'
    or lower(coalesce(name, '')) like '%bag%'
  );

-- Do not publish products that have no usable image anywhere.
update public.products p
set is_active = false
where p.is_active = true
  and not exists (
    select 1
    from unnest(coalesce(p.images, array[]::text[])) as image_url
    where btrim(coalesce(image_url, '')) <> ''
  )
  and not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(p.color_variants, '[]'::jsonb)) = 'array' then coalesce(p.color_variants, '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as variant
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(variant->'images') = 'array' then variant->'images'
        else '[]'::jsonb
      end
    ) as variant_image
    where btrim(coalesce(variant_image, '')) <> ''
  );

-- Bank transfer remains supported by the code, but stays disabled until real account details are configured.
update public.payment_methods
set is_active = false,
    updated_at = now()
where code = 'bank';

-- Remove only known placeholder bank-account values; leave real values untouched.
update public.site_settings
set value = '[]'::jsonb
where key in ('bank_accounts', 'bank_accounts_ye', 'bank_accounts_sa')
  and (
    value::text like '%SA1234567890123456789012%'
    or value::text like '%YE1234567890123456%'
  );

-- Remove only known placeholder WhatsApp values; the UI hides WhatsApp when no real number exists.
update public.site_settings
set value = '""'::jsonb
where key in ('whatsapp', 'whatsapp_ye', 'whatsapp_sa')
  and (
    value::text like '%+967123456789%'
    or value::text like '%+966123456789%'
  );

-- Remove the known placeholder Saudi phone while preserving the configured Yemen phone.
update public.site_settings
set value = value - 'phone_sa'
where key = 'store_info'
  and jsonb_typeof(value) = 'object'
  and value->>'phone_sa' = '+966123456789';

-- Keep the configured delivery fee/duration, but never expose a Demo name to customers.
update public.delivery_companies
set name = 'التوصيل المحلي'
where is_active = true
  and lower(name) like '%demo%';
