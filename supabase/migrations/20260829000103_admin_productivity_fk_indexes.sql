-- Cover foreign keys introduced by the admin productivity foundation.

create index if not exists whatsapp_templates_created_by_idx
  on public.whatsapp_templates (created_by)
  where created_by is not null;

create index if not exists customer_internal_notes_created_by_idx
  on public.customer_internal_notes (created_by)
  where created_by is not null;

create index if not exists order_internal_notes_created_by_idx
  on public.order_internal_notes (created_by)
  where created_by is not null;

create index if not exists admin_change_revisions_created_by_idx
  on public.admin_change_revisions (created_by)
  where created_by is not null;

create index if not exists admin_approval_requests_requested_by_idx
  on public.admin_approval_requests (requested_by)
  where requested_by is not null;

create index if not exists admin_approval_requests_reviewed_by_idx
  on public.admin_approval_requests (reviewed_by)
  where reviewed_by is not null;
