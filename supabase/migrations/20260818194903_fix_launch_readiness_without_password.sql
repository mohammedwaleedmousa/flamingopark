-- Launch-readiness fixes excluding password policy changes.

-- Remove legacy permissive Storage policies that bypass admin authorization.
drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Allow authenticated uploads invoices" on storage.objects;

-- Recreate uploads write policies with explicit admin authorization.
drop policy if exists "Admins can upload files" on storage.objects;
create policy "Admins can upload files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

drop policy if exists "Admins can update files" on storage.objects;
create policy "Admins can update files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'uploads'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
)
with check (
  bucket_id = 'uploads'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

drop policy if exists "Admins can delete files" on storage.objects;
create policy "Admins can delete files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'uploads'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Customer registration supports international ISO 3166-1 alpha-2 country codes.
alter table public.customers drop constraint if exists customers_country_check;
alter table public.customers
  add constraint customers_country_check
  check (country ~ '^[A-Z]{2}$');

-- The current checkout only implements cash/COD and bank transfer.
update public.payment_methods
set is_active = false,
    updated_at = now()
where type not in ('cash', 'bank');

alter table public.payment_methods drop constraint if exists payment_methods_supported_type_check;
alter table public.payment_methods
  add constraint payment_methods_supported_type_check
  check (type in ('cash', 'bank'));
